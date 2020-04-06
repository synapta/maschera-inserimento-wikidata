var mymap = L.map('mapid').setView([42, 12], 5);

L.tileLayer('https://tile.synapta.io/styles/osm-bright/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
		'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
}).addTo(mymap);

mymap.on('click', function(ev){
  var latlng = mymap.mouseEventToLatLng(ev.originalEvent);
  console.log(latlng.lat + ', ' + latlng.lng);
  $("#coord").val(latlng.lat + ', ' + latlng.lng);
});
