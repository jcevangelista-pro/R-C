<?php
// ============================================================
// Monthly Report Generator (admin/owner only)
// ?report=sales      -> Monthly Total Sales PDF
// ?report=inventory  -> Monthly Inventory Sales PDF
// Streams a PDF for the current calendar month.
// ============================================================

require_once __DIR__ . '/../database/api_bootstrap.php';
require_role(['admin', 'owner']);

require_once __DIR__ . '/../vendor/autoload.php';

$report = $_GET['report'] ?? '';

try {
    // Current month boundaries (server timezone = Asia/Manila)
    $monthStart = date('Y-m-01 00:00:00');
    $monthEnd   = date('Y-m-t 23:59:59');
    $monthLabel = date('F Y');

    if ($report === 'sales') {
        $pdf = build_sales_report($pdo, $monthStart, $monthEnd, $monthLabel);
    } elseif ($report === 'inventory') {
        $pdf = build_inventory_report($pdo, $monthStart, $monthEnd, $monthLabel);
    } else {
        api_error('Unknown report type.');
    }

    $filename = ($report === 'sales' ? 'Total_Sales_Report_' : 'Inventory_Sales_Report_')
        . date('Y-m') . '.pdf';

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($pdf));
    header('Cache-Control: no-store');
    echo $pdf;
    audit_event($pdo, 'report.generated', null, ['report' => $report, 'month' => date('Y-m')]);
    exit;

} catch (Throwable $e) {
    error_log($e->__toString());
    api_error('Unable to generate the report: ' . $e->getMessage(), 500);
}

// ── Total Sales report ──────────────────────────────────────
function build_sales_report(PDO $pdo, string $start, string $end, string $monthLabel): string
{
    // Monthly revenue figures
    // gross = full value of all orders placed this month (incl. cancelled)
    // net   = actual revenue, excluding cancelled orders
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(total_amount),0) AS revenue,
               COALESCE(SUM(total_amount),0) AS gross_revenue,
               COALESCE(SUM(CASE WHEN order_status <> 'Cancelled' THEN total_amount ELSE 0 END),0) AS net_revenue,
               COUNT(*) AS total_orders,
               SUM(order_status='Completed') AS completed,
               SUM(order_status='Cancelled') AS cancelled,
               SUM(order_status NOT IN ('Completed','Cancelled')) AS in_progress
        FROM orders
        WHERE date_requested BETWEEN ? AND ?
    ");
    $stmt->execute([$start, $end]);
    $summary = $stmt->fetch();

    // Revenue breakdown by order status
    $stmt = $pdo->prepare("
        SELECT order_status,
               COUNT(*) AS orders,
               COALESCE(SUM(total_amount),0) AS amount
        FROM orders
        WHERE date_requested BETWEEN ? AND ?
        GROUP BY order_status
    ");
    $stmt->execute([$start, $end]);
    $byStatus = $stmt->fetchAll();

    // Payments verified within the month (actual cash collected)
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(amount),0)
        FROM payments
        WHERE status='Verified' AND verified_at BETWEEN ? AND ?
    ");
    $stmt->execute([$start, $end]);
    $collected = (float)$stmt->fetchColumn();

    // Completed order list
    $stmt = $pdo->prepare("
        SELECT o.order_id, CONCAT(u.first_name,' ',u.last_name) AS customer,
               o.total_amount, o.payment_status,
               DATE_FORMAT(o.date_requested,'%b %d, %Y') AS date_req,
               DATE_FORMAT(o.date_finished,'%b %d, %Y') AS date_fin
        FROM orders o
        JOIN customers c ON c.customer_id=o.customer_id
        JOIN users u ON u.user_id=c.user_id
        WHERE o.date_requested BETWEEN ? AND ? AND o.order_status='Completed'
        ORDER BY o.date_finished DESC, o.order_id DESC
    ");
    $stmt->execute([$start, $end]);
    $completedOrders = $stmt->fetchAll();

    $html = report_header('Monthly Total Sales Report', $monthLabel)
        . stats_row([
            stat_box('Revenue for the Month', 'P' . number_format((float)$summary['revenue'], 2)),
            stat_box('Total Orders', number_format((int)$summary['total_orders'])),
            stat_box('Completed Orders', number_format((int)$summary['completed'])),
            stat_box('Cancelled Orders', number_format((int)$summary['cancelled'])),
        ])
        . stats_row([
            stat_box('Gross Revenue (incl. cancelled)', 'P' . number_format((float)$summary['gross_revenue'], 2)),
            stat_box('Net Revenue (excl. cancelled)', 'P' . number_format((float)$summary['net_revenue'], 2)),
        ])
        . '<div class="note">Orders still pending or in progress this month: '
        . number_format((int)$summary['in_progress'])
        . ' &nbsp;|&nbsp; Payments verified within the month: P' . number_format($collected, 2) . '</div>';

    // Status breakdown table
    $html .= '<h2>Revenue Breakdown by Order Status</h2>'
        . '<table><thead><tr><th>Order Status</th><th>Orders</th><th>Amount (₱)</th></tr></thead><tbody>';
    if ($byStatus) {
        foreach ($byStatus as $row) {
            $html .= '<tr><td>' . htmlspecialchars($row['order_status']) . '</td>'
                . '<td class="center">' . number_format((int)$row['orders']) . '</td>'
                . '<td class="right">P' . number_format((float)$row['amount'], 2) . '</td></tr>';
        }
    } else {
        $html .= '<tr><td colspan="3" class="center empty">No orders this month.</td></tr>';
    }
    $html .= '</tbody></table>';

    // Completed orders table
    $html .= '<h2>Completed Orders</h2>'
        . '<table><thead><tr><th>Order ID</th><th>Customer</th><th>Date Requested</th><th>Date Finished</th><th>Payment</th><th>Amount (₱)</th></tr></thead><tbody>';
    if ($completedOrders) {
        foreach ($completedOrders as $row) {
            $html .= '<tr><td>' . htmlspecialchars($row['order_id']) . '</td>'
                . '<td>' . htmlspecialchars($row['customer']) . '</td>'
                . '<td>' . htmlspecialchars($row['date_req']) . '</td>'
                . '<td>' . htmlspecialchars($row['date_fin']) . '</td>'
                . '<td class="center">' . htmlspecialchars($row['payment_status']) . '</td>'
                . '<td class="right">P' . number_format((float)$row['total_amount'], 2) . '</td></tr>';
        }
    } else {
        $html .= '<tr><td colspan="6" class="center empty">No completed orders this month.</td></tr>';
    }
    $html .= '</tbody></table>';

    return render_pdf($html, 'sales');
}

// ── Inventory Sales report ──────────────────────────────────
function build_inventory_report(PDO $pdo, string $start, string $end, string $monthLabel): string
{
    // Movement totals for the month
    $stmt = $pdo->prepare("
        SELECT
            SUM(action='Deducted') AS deducted_count,
            COALESCE(SUM(CASE WHEN action='Deducted' THEN quantity ELSE 0 END),0) AS deducted_qty,
            SUM(action='Added') AS added_count,
            COALESCE(SUM(CASE WHEN action='Added' THEN quantity ELSE 0 END),0) AS added_qty,
            SUM(action='Adjusted') AS adjusted_count
        FROM inventory_history
        WHERE created_at BETWEEN ? AND ?
    ");
    $stmt->execute([$start, $end]);
    $summary = $stmt->fetch();

    // Movement per item
    $stmt = $pdo->prepare("
        SELECT i.item_name, i.category, i.unit_of_measure,
               COALESCE(SUM(CASE WHEN h.action='Deducted' THEN h.quantity ELSE 0 END),0) AS deducted,
               COALESCE(SUM(CASE WHEN h.action='Added' THEN h.quantity ELSE 0 END),0) AS added
        FROM inventory i
        JOIN inventory_history h ON h.inventory_id = i.inventory_id AND h.created_at BETWEEN ? AND ?
        GROUP BY i.inventory_id, i.item_name, i.category, i.unit_of_measure
        ORDER BY deducted DESC, added DESC, i.item_name ASC
    ");
    $stmt->execute([$start, $end]);
    $items = $stmt->fetchAll();

    // Full transaction log
    $stmt = $pdo->prepare("
        SELECT h.action, h.quantity, h.stock_before, h.stock_after,
               i.item_name, h.order_id, h.reason,
               DATE_FORMAT(h.created_at,'%b %d, %Y %h:%i %p') AS date_time
        FROM inventory_history h
        JOIN inventory i ON i.inventory_id = h.inventory_id
        WHERE h.created_at BETWEEN ? AND ?
        ORDER BY h.created_at DESC
        LIMIT 200
    ");
    $stmt->execute([$start, $end]);
    $log = $stmt->fetchAll();

    $html = report_header('Monthly Inventory Sales Report', $monthLabel)
        . stats_row([
            stat_box('Total Items Deducted', number_format((float)$summary['deducted_qty'], 2) . ' <span class="unit">(' . number_format((int)$summary['deducted_count']) . ' transactions)</span>'),
            stat_box('Total Items Added', number_format((float)$summary['added_qty'], 2) . ' <span class="unit">(' . number_format((int)$summary['added_count']) . ' transactions)</span>'),
        ]);

    // Per-item movement table
    $html .= '<h2>Stock Movement by Item</h2>'
        . '<table><thead><tr><th>Item</th><th>Category</th><th>Unit</th><th>Deducted</th><th>Added</th></tr></thead><tbody>';
    if ($items) {
        foreach ($items as $row) {
            $html .= '<tr><td>' . htmlspecialchars($row['item_name']) . '</td>'
                . '<td>' . htmlspecialchars($row['category']) . '</td>'
                . '<td>' . htmlspecialchars($row['unit_of_measure']) . '</td>'
                . '<td class="center">' . number_format((float)$row['deducted'], 2) . '</td>'
                . '<td class="center">' . number_format((float)$row['added'], 2) . '</td></tr>';
        }
    } else {
        $html .= '<tr><td colspan="5" class="center empty">No stock movement this month.</td></tr>';
    }
    $html .= '</tbody></table>';

    // Transaction log
    $html .= '<h2>Transaction Log (latest 200)</h2>'
        . '<table><thead><tr><th>Date &amp; Time</th><th>Action</th><th>Item</th><th>Qty</th><th>Before</th><th>After</th><th>Order / Reason</th></tr></thead><tbody>';
    if ($log) {
        foreach ($log as $row) {
            $ref = $row['order_id'] !== null ? $row['order_id'] : (string)($row['reason'] ?? '');
            $html .= '<tr><td>' . htmlspecialchars($row['date_time']) . '</td>'
                . '<td class="center">' . htmlspecialchars($row['action']) . '</td>'
                . '<td>' . htmlspecialchars($row['item_name']) . '</td>'
                . '<td class="center">' . number_format((float)$row['quantity'], 2) . '</td>'
                . '<td class="center">' . number_format((float)$row['stock_before'], 2) . '</td>'
                . '<td class="center">' . number_format((float)$row['stock_after'], 2) . '</td>'
                . '<td>' . htmlspecialchars($ref) . '</td></tr>';
        }
    } else {
        $html .= '<tr><td colspan="7" class="center empty">No inventory transactions this month.</td></tr>';
    }
    $html .= '</tbody></table>';

    return render_pdf($html, 'inventory');
}

// ── Shared HTML fragments ───────────────────────────────────
function report_header(string $title, string $monthLabel): string
{
    $logoPath = realpath(__DIR__ . '/../imgs/image 2.png');
    $logo = $logoPath ? '<img src="' . htmlspecialchars($logoPath) . '" class="logo">' : '';
    return '<h1>' . $logo . 'R&amp;C PRINTING SERVICES</h1>'
        . '<div class="subtitle">' . htmlspecialchars($title) . ' — ' . htmlspecialchars($monthLabel) . '</div>'
        . '<div class="generated">Generated on ' . date('F d, Y h:i A') . '</div>';
}

function stat_box(string $label, string $value): string
{
    return '<div class="stat-box"><div class="stat-label">' . htmlspecialchars($label)
        . '</div><div class="stat-value">' . $value . '</div></div>';
}

// Wrap stat boxes in a table row — dompdf has no flex/grid support.
function stats_row(array $boxes): string
{
    $cells = '';
    foreach ($boxes as $box) {
        $cells .= '<td class="stat-cell">' . $box . '</td>';
    }
    return '<table class="stats-grid"><tr>' . $cells . '</tr></table>';
}

// ── Render HTML into a branded PDF ──────────────────────────
function render_pdf(string $bodyHtml, string $accent): string
{
    $accentColor = $accent === 'inventory' ? '#1b1f4b' : '#ec4899';
    $html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body { font-family: "Segoe UI", Arial, sans-serif; color: #1b1f4b; font-size: 12px; }
        h1 { font-size: 22px; color: ' . $accentColor . '; margin: 0 0 4px; }
        h1 .logo { height: 36px; vertical-align: middle; margin-right: 10px; }
        .subtitle { font-size: 15px; font-weight: 700; color: #ec4899; margin-bottom: 2px; }
        .generated { font-size: 10px; color: #6b7280; margin-bottom: 14px; }
        h2 { font-size: 14px; color: ' . $accentColor . '; margin: 18px 0 8px; }
        .stats-grid { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 10px; }
        .stats-grid td { padding: 0; }
        .stat-box { background: #fdf1f6; border-top: 3px solid ' . $accentColor . '; border-radius: 6px; padding: 10px 12px; }
        .stat-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
        .stat-value { font-size: 17px; font-weight: 800; color: ' . $accentColor . '; }
        .stat-value .unit { font-size: 10px; font-weight: 600; color: #6b7280; }
        .note { font-size: 10px; color: #6b7280; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        thead th { background: #1b1f4b; color: #fff; font-size: 10px; text-align: left; padding: 7px 8px; }
        tbody td { padding: 6px 8px; font-size: 10.5px; border-bottom: 1px solid #f3f4f6; }
        tbody tr:nth-child(even) td { background: #fdf1f6; }
        .center { text-align: center; }
        .right { text-align: right; }
        .empty { color: #6b7280; padding: 14px; }
    </style></head><body>' . $bodyHtml . '</body></html>';

    $dompdf = new Dompdf\Dompdf(['isRemoteEnabled' => false]);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    return $dompdf->output();
}
