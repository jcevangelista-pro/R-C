document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.nav-tabs[role="tablist"] > li');
    const panes = document.querySelectorAll('.tab-content > .tab-pane');

    // On load: show only step1, set only first tab active
    function init() {
        panes.forEach(function (pane, i) {
            if (i === 0) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
        tabs.forEach(function (tab, i) {
            if (i === 0) {
                tab.classList.add('active');
                tab.classList.remove('disabled');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // Switch to a step when its tab is clicked
    tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function (e) {
            e.preventDefault();

            // Update tab active states
            tabs.forEach(function (t) {
                t.classList.remove('active');
            });
            tab.classList.add('active');

            // Show only the matching pane
            panes.forEach(function (pane, i) {
                if (i === index) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });

    init();
});
