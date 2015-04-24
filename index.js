var request = require('request');
var cheerio = require('cheerio')

request('http://mannheim.xn--mngelmelder-l8a.de/bms/load_marker_json?rows=500000', function (err, res, body){
	if (!err && res.statusCode == 200) {
		var reports = [];
		var json = JSON.parse(body);
		json.marker.forEach(function(item, i){
			var report = {};
			var $ = cheerio.load(item.html, {normalizeWhitespace: false});
			report.description = $('.wdw-detail-text').eq(0).text().replace('Beschreibung:', '').replace(/ +(?= )/g,'');
			report.status = $('.wdw-detail-responsible').eq(0).text().replace('Status: ', '');
			report.responsible = $('.wdw-detail-responsible').eq(1).text().replace('Zuständigkeit: ', '');
			report.url = $('a').attr('href');

			report.coordinates = {};
			report.coordinates.lat = item.lat;
			report.coordinates.lon = item.lon;

			report.id = item.msgid;

			reports.push(report);
		});
	}
});