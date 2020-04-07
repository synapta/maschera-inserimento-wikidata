var mymap = L.map('mapid').setView([42, 12], 5);

L.tileLayer('https://tile.synapta.io/styles/osm-bright/{z}/{x}/{y}.png', {
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
		'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
}).addTo(mymap);

let clickedOnMap = 0;
mymap.on('click', function(ev){
  clickedOnMap++;
  let currentClickCount = clickedOnMap;
  var latlng = mymap.mouseEventToLatLng(ev.originalEvent);
  //console.log(latlng.lat + ', ' + latlng.lng);
  $("#coordLat").val(latlng.lat);
  $("#coordLng").val(latlng.lng);

  //code to get possible relation id from OSM
  /*setTimeout(function() {
    if (currentClickCount === clickedOnMap) {
      let data = `data=[timeout:10][out:json];is_in(${latlng.lat},${latlng.lng})->.a;relation(pivot.a);out tags bb;`
      $.ajax({
        type: "POST",
        url: 'https://overpass-api.de/api/interpreter',
        data: data,
        success: function(data){
          for (let i = 0; i < data.elements.length; i++) {
            if (!data.elements[i].tags.hasOwnProperty('admin_level')) {
              if (data.elements[i].tags.type !== 'boundary') {
                console.log(data.elements[i]);
              }
            }
          }
        }
      });
    }
  }, 1000);*/
});
