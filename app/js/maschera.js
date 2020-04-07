let mainObject = {};

const url = new URL(window.location.href);
const id = url.searchParams.get("id");

$.ajax({
    type: "GET",
    url: `/api/entity/get?id=${id}`,
    success: function(data){
        $("input[name=label]").val(data.labels.it.value);
        $("input[name=descrizione]").val(data.descriptions.it.value);

        if (data.claims.P131) {
            let comune = data.claims.P131[0].mainsnak.datavalue.value.id;

            $.ajax({
                type: "GET",
                url: `/api/query/comuneByQ?id=${comune}`,
                success: function(data) {
                    $("input[name=comune]").val(data.title);
                }
            });
        }

        if (data.claims.P6375) {
            let indirizzo = data.claims.P6375[0].mainsnak.datavalue.value.text;
            $("input[name=indirizzo]").val(indirizzo);
        }

        if (data.claims.P625) {
            let lat = data.claims.P625[0].mainsnak.datavalue.value.latitude;
            let long = data.claims.P625[0].mainsnak.datavalue.value.longitude;
            $("input[name=lat]").val(lat);
            $("input[name=long]").val(long);
            mymap.flyTo([lat, long], 16);
        }

        if (data.claims.P856) {
            let website = data.claims.P856[0].mainsnak.datavalue.value;
            $("input[name=sito-web]").val(website);
        }
    },
    error: function(data) {

    }
});


document.getElementById("sendMaschera").addEventListener("click", function () {
  let label = $("input[name=label]").val();
  if (label) {
      mainObject.label = label;
  }

  let descrizione = $("input[name=descrizione]").val();
  if (descrizione) {
      mainObject.descrizione = descrizione;
  }

  let tipologia = $("input[name=tipologia]").val();
  if (tipologia) {
      mainObject.P31 = tipologia;
  }

  let comune = $('.ui.search').search('get result', $("input[name=comune]").val());
  if (comune) {
      mainObject.P131 = comune.id;
  }

  let lat = $("input[name=lat]").val();
  let long = $("input[name=long]").val();
  if (lat && long) {
      mainObject.P625 = `Point(${lat}, ${long})`
  }

  let indirizzo = $("input[name=indirizzo]").val();
  if (indirizzo) {
      mainObject.P6375 = indirizzo;
  }

  let website = $("input[name=sito-web]").val();
  if (website) {
      mainObject.P856 = website;
  }

  console.log(mainObject);
});
