// La web pregunta por /ocs/v1.php/cloud/user para "descubrir" la carpeta de
// Nextcloud. Ya no hay Nextcloud: respondemos un id fijo.
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.end('<?xml version="1.0"?><ocs><meta><status>ok</status><statuscode>100</statuscode></meta><data><id>bikersociety</id><display-name>Biker Society</display-name></data></ocs>');
};
