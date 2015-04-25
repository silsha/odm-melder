var request = require('request');
var cheerio = require('cheerio');
var r 		= require('rethinkdb');
var q 		= require('q');

var connection = null;


q.fcall(connect)
.then(getReports)
.then(filterDuplicates)
.then(insertReports)
.done();


function getReports(){
	var deferred = q.defer();
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

				report.msgid = item.msgid;

				reports.push(report);
			});
			deferred.resolve(reports);
		}
	});
	return deferred.promise;
}

function connect(reports){
	var deferred = q.defer();
	r.connect( {host: 'localhost', port: 28015, db: "odm_melder"}, function(err, conn) {
	    if (err) throw err;
	    connection = conn;
	    deferred.resolve(reports);
	});
	return deferred.promise;
}

function filterDuplicates(reports){
	var temp = Array();
	var counter = 0;
	var deferred = q.defer();
	reports.forEach(function(item, i){
		r.table('reports').filter(item).count().run(connection, function(err, res){
			counter++;
			if (res == 0){
				temp.push(item);
			}
			if(counter == reports.length){
				console.log("Found " + temp.length + " new reports.");
				deferred.resolve(temp);
			}
		});
	});
	return deferred.promise;
}

function insertReports(reports){
	reports.forEach(function(item, i){
		item.time = new Date();
		r.table('reports').insert(item).run(connection, function(err, res){
			if (err) throw err;
		});
	})
	process.exit(0);
}