const PaymentMethodButton = document.getElementById ('PaymentMethodButton');
const PaymentMethodModal = document.getElementById ('PaymentMethodModal');
const PMBackButton = document.getElementById ('PMBackButton');

PaymentMethodButton.addEventListener('click', () => {
    PaymentMethodModal.classList.add('show');
 });

PMBackButton.addEventListener('click', () => {
    PaymentMethodModal.classList.remove('show');
 });

/* Final Payment Modal */
const FinalPaymentButton = document.getElementById ('FinalPaymentButton');
const FinalPaymentModal = document.getElementById ('FinalPaymentModal');
const FPMBackButton = document.getElementById ('FPMBackButton');

FinalPaymentButton.addEventListener('click', () => {
    FinalPaymentModal.classList.add('show');
 });

FPMBackButton.addEventListener('click', () => {
    FinalPaymentModal.classList.remove('show');
 });

 /* Order Sumamry Modal */
const OrderSummaryButton = document.getElementById ('OrderSummaryButton');
const OrderSummaryModal = document.getElementById ('OrderSummaryModal');
const OSMBackButton = document.getElementById ('OSMBackButton');

OrderSummaryButton.addEventListener('click', () => {
    OrderSummaryModal.classList.add('show');
 });

OSMBackButton.addEventListener('click', () => {
    OrderSummaryModal.classList.remove('show');
 });
