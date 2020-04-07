$('.ui.search')
  .search({
    apiSettings: {
      url: 'http://localhost:8080/api/suggestion/comune?q={query}'
    },
    fields: {
      results : 'items',
      title   : 'title'
    },
    minCharacters : 3,
    onSelect: function(res, resp) {
        $.ajax({
            type: "GET",
            url: `https://nominatim.openstreetmap.org/search.php?q=${res.title}, Italia&format=json`,
            success: function(data){
                console.log(data[0].lat, data[0].lon);
                mymap.panTo(new L.LatLng(data[0].lat, data[0].lon));
                mymap.setZoom(10);
            }
        });
    }
  })
;
