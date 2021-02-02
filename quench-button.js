Hooks.on("renderSidebar", function(sidebar, html, options) {
    console.log("Rendering sidebar!", arguments);
    const $quenchButton = $(`<button class="quench-button"><b>QUENCH</b></button>`);

    $quenchButton.click(function onClick() {
        quench.app.render(true);
    });

    html.append($quenchButton);
})
