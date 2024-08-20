const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const app = express();
const port = 3000;

// Configura el XML de la solicitud
const soapRequest = `
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws-redlogistic.appsiscore.com/">
   <soapenv:Header/>
   <soapenv:Body>
      <ws:ConsultarGuiaImagen soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
         <guia xsi:type="xsd:string">420331989505516321211036548605</guia>
         <tokn xsi:type="xsd:string">1593aaeeb60a560c156387989856db6be7edc8dc220f9feae3aea237da6a951d</tokn>
      </ws:ConsultarGuiaImagen>
   </soapenv:Body>
</soapenv:Envelope>
`;

const config = {
  method: 'post',
  url: 'http://ws-redlogistic.appsiscore.com/trazabilidad_v2.php?wsdl',
  headers: {
    'Content-Type': 'text/xml;charset=UTF-8',
  },
  data: soapRequest,
};

// Función para asignar iconos y colores basados en el tipo de movimiento
function getStatusInfo(type) {
  switch (type) {
    case 'ENTREGADO':
      return {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
        color: 'text-green-600',
        bgColor: 'bg-green-500'
      };
    case 'DEVUELTO':
      return {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
        color: 'text-red-600',
        bgColor: 'bg-red-500'
      };
    case 'PENDIENTE':
      return {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500'
      };
    default:
      return {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c0-2-2-2-2-2s-2 0-2 2 2 4 2 4h0s2-2 2-4zm0 6h.01" /></svg>`,
        color: 'text-gray-600',
        bgColor: 'bg-gray-500'
      };
  }
}

// Ruta principal para mostrar los datos en un formato de línea de tiempo dentro de una tarjeta
app.get('/', (req, res) => {
  axios(config)
    .then(response => {
      xml2js.parseString(response.data, (err, result) => {
        if (err) {
          res.send('Error parsing XML');
        } else {
          // Extraer el valor de la clave "_" dentro de Result
          const rawXML = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['ns1:ConsultarGuiaImagenResponse'][0]['Result'][0]['_'];

          // Parsear el contenido XML que estaba dentro de la clave "_"
          xml2js.parseString(rawXML, (err, parsedData) => {
            if (err) {
              res.send('Error parsing inner XML');
            } else {
              const movements = parsedData.ConsultarGuiaImagenResult.Mov[0].InformacionMov || [];

              // Generar el contenido de la línea de tiempo con iconos outline blancos
              let timelineItems = movements.map((movement, index) => {
                const statusInfo = getStatusInfo(movement.Tipo_Movimiento[0]);
                return `
                  <div class="relative pl-6 mb-8 flex items-start">
                    <div class="absolute left-0 top-0 transform -translate-x-10 w-8 h-8 ${statusInfo.bgColor} rounded-full flex items-center justify-center">
                      ${statusInfo.icon}
                    </div>
                    <div class="flex-1 ml-8">
                      <p class="text-sm text-gray-500">${movement.FecMov[0]}</p>
                      <p class="font-semibold ${statusInfo.color}">${movement.Tipo_Movimiento[0]}</p>
                      <p class="text-sm text-gray-600">${movement.DetalleMov[0]}</p>
                    </div>
                  </div>
                `;
              }).join('');

              // Estructura HTML para mostrar la línea de tiempo dentro de una tarjeta
              const htmlContent = `
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Tracking Timeline</title>
                  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.0.3/dist/tailwind.min.css" rel="stylesheet">
                </head>
                <body class="bg-gray-100 text-gray-800">
                  <div class="flex justify-center items-center min-h-screen py-5">
                    <div class="bg-white p-6 rounded-lg shadow-lg w-1/3">
                      <h1 class="text-2xl font-bold mb-4 text-center">Tracking Timeline</h1>
                      <div class="relative border-l-2 border-gray-300 pl-6">
                        ${timelineItems}
                      </div>
                    </div>
                  </div>
                </body>
                </html>
              `;

              // Enviar el contenido HTML al navegador
              res.send(htmlContent);
            }
          });
        }
      });
    })
    .catch(error => {
      res.send('Error fetching data: ' + error.message);
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
