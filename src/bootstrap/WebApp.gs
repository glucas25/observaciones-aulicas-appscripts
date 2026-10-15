function doGet(){return HtmlService.createTemplateFromFile('ui/Index').evaluate().setTitle('Visitas Áulicas').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);}
function include(filename){return HtmlService.createTemplateFromFile(filename).getRawContent().replace(/https:\/\//g,'https:\\x2f\\x2f');}

