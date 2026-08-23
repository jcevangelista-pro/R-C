USE rnc;

-- Legacy catalog products had no bill of materials. Give each unmapped product a
-- traceable zero-stock base item so every product uses the same safe deduction
-- workflow without claiming inventory that does not exist.
INSERT INTO inventory
    (item_name, description, category, unit_of_measure, stock, reorder_level, unit_cost, is_active, remarks, created_by)
SELECT
    CONCAT('Product Base: ', LEFT(p.name, 130)),
    CONCAT('Auto-created base inventory for catalog product #', p.product_id),
    CASE WHEN p.type_of_product='T-Shirt' THEN 'SHIRTS' ELSE 'OTHER' END,
    'Pcs', 0.00, 10.00, 0.00, TRUE,
    CONCAT('AUTO_PRODUCT_BASE:', p.product_id),
    p.created_by
FROM products p
LEFT JOIN product_materials pm ON pm.product_id=p.product_id
WHERE pm.product_material_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM inventory i WHERE i.remarks=CONCAT('AUTO_PRODUCT_BASE:',p.product_id));

INSERT INTO product_materials (product_id, inventory_id, quantity_required)
SELECT p.product_id, i.inventory_id, 1.00
FROM products p
JOIN inventory i ON i.remarks=CONCAT('AUTO_PRODUCT_BASE:',p.product_id)
LEFT JOIN product_materials pm ON pm.product_id=p.product_id
WHERE pm.product_material_id IS NULL;

-- Repair accepted legacy orders that predate automatic process-step creation.
INSERT IGNORE INTO order_process (order_id,process_step_id,status,completed_at,completed_by)
SELECT o.order_id,ps.process_step_id,
       CASE WHEN ps.step_number=1 THEN 'Completed' WHEN ps.step_number=2 THEN 'In Progress' ELSE 'Pending' END,
       CASE WHEN ps.step_number=1 THEN COALESCE(o.date_accepted,o.date_requested) ELSE NULL END,
       CASE WHEN ps.step_number=1 THEN o.accepted_by ELSE NULL END
FROM orders o CROSS JOIN process_steps ps
WHERE o.order_status='In Progress'
  AND NOT EXISTS (SELECT 1 FROM order_process existing WHERE existing.order_id=o.order_id);

UPDATE order_process op
JOIN process_steps current_step ON current_step.process_step_id=op.process_step_id
JOIN (
    SELECT candidate.order_id, MIN(candidate_steps.step_number) AS next_step
    FROM order_process candidate
    JOIN orders legacy_order ON legacy_order.order_id=candidate.order_id AND legacy_order.order_status='In Progress'
    JOIN process_steps candidate_steps ON candidate_steps.process_step_id=candidate.process_step_id
    WHERE candidate.status='Pending'
      AND NOT EXISTS (SELECT 1 FROM order_process active WHERE active.order_id=candidate.order_id AND active.status='In Progress')
    GROUP BY candidate.order_id
) repair ON repair.order_id=op.order_id AND repair.next_step=current_step.step_number
SET op.status='In Progress';

UPDATE orders
SET remaining_balance=GREATEST(0,total_amount-amount_paid)
WHERE payment_status!='Paid' AND remaining_balance=0 AND total_amount>amount_paid;
