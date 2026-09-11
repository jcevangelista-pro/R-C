(function () {
    document.querySelectorAll('.password-toggle').forEach(function (button) {
        const field = button.closest('.password-field');
        const input = field ? field.querySelector('input') : null;
        if (!input) return;

        button.addEventListener('click', function () {
            const showPassword = input.type === 'password';
            input.type = showPassword ? 'text' : 'password';
            button.classList.toggle('is-visible', showPassword);
            button.setAttribute('aria-pressed', String(showPassword));
            button.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
            input.focus({ preventScroll: true });
        });
    });
})();
