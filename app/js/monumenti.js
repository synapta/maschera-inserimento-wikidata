$('.ui.search')
  .search({
    apiSettings: {
      url: 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search={query}&format=json&errorformat=plaintext&language=it&uselang=it&type=item'
    },
    fields: {
      results : 'search',
      title   : 'label',
      description: 'description'
    },
    minCharacters : 3,
    onSelect: function(res, resp) {
        /*$.ajax({
            type: "GET",
            url: `https://nominatim.openstreetmap.org/search.php?q=${res.title}, Italia&format=json`,
            success: function(data){
                console.log(data[0].lat, data[0].lon);
                mymap.panTo(new L.LatLng(data[0].lat, data[0].lon));
                mymap.setZoom(10);
            }
        });*/
        console.log(res)
    }
  })
;
