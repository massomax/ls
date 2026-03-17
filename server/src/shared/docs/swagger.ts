import path from "node:path";
import express from "express";
import YAML from "yamljs";
import swaggerUiDist from "swagger-ui-dist";

const router = express.Router();

// 1) Грузим спецификацию один раз при старте
const specPath = path.join(process.cwd(), "docs", "openapi.yaml");
const openapiDocument = YAML.load(specPath);

// 2) Отдаём JSON со спецификацией
router.get("/openapi.json", (_req, res) => res.json(openapiDocument));

// 3) Наш HTML (без inline-скриптов)
router.get("/docs", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>LastPiece API Docs</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
    <style> html,body,#swagger-ui { height:100%; margin:0 } </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/swagger-ui/swagger-ui-bundle.js"></script>
    <script src="/swagger-ui/swagger-ui-standalone-preset.js"></script>
    <script src="/docs/init.js"></script>
  </body>
</html>`);
});

// 4) Инициализация UI отдельным файлом (чтобы не блокировал CSP)
router.get("/docs/init.js", (_req, res) => {
  res.type("application/javascript").send(`
    (function () {
      if (typeof SwaggerUIBundle === 'undefined') {
        document.body.innerHTML = '<pre>SwaggerUI assets not loaded</pre>';
        return;
      }
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout'
      });
    })();
  `);
});

// 5) Ассеты swagger-ui-dist по /swagger-ui/*
const swaggerAssets = swaggerUiDist.getAbsoluteFSPath();
router.use(
  "/swagger-ui",
  express.static(swaggerAssets, { fallthrough: false })
);

export default router;
