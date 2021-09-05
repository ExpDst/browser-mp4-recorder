const Express = require('express');

const app = Express();

app.use((req, res, next) => {

    res.header("Cross-Origin-Opener-Policy", "same-origin");
    res.header("Cross-Origin-Embedder-Policy", "require-corp");

    next();
});

app.use(Express.static("./build"));


app.listen(8089, () => {
    console.log("Listening on port 8089");
});
