$('.ui.search')
  .search({
    apiSettings: {
      url: '/api/suggestion/comune?q={query}'
    },
    fields: {
      results : 'items',
      title   : 'title'
    },
    minCharacters : 3,
    onSelect: function(res, resp) {
        let city = res.title.replace(/comune di /ig, '');
        $.ajax({
            type: "GET",
            url: `https://nominatim.openstreetmap.org/search.php?city=${city}&country=Italia&format=json`,
            success: function(data){
                console.log(data[0].lat, data[0].lon);
                mymap.flyTo([data[0].lat, data[0].lon],10);
            }
        });
    }
  })
;

$('input[name=indirizzo]').keyup(function(event) {
    if (event.keyCode === 13) {
        centerOnAddress();
    }
});


centerOnAddress = function () {
    let city = $("input[name=comune]").val().replace(/comune di /ig, '');;
    let address = $('input[name=indirizzo]').val();
    $.ajax({
        type: "GET",
        url: encodeURI(`https://nominatim.openstreetmap.org/search.php?street=${address}&city=${city}&country=Italia&format=json`),
        success: function(data){
            if (data.length > 0) {
                console.log(data[0].lat, data[0].lon);
                mymap.flyTo([data[0].lat, data[0].lon],17);
            }
        }
    });
}
