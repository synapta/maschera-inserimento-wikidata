let mainObject = { "entity": {} };
mainObject.entity.claims = {};

const url = new URL(window.location.href);
const id = url.searchParams.get("id");

mainObject.entity.id = id;
mainObject.entity.claims.P2186 = {};
mainObject.entity.claims.P2186.snaktype = "somevalue";
mainObject.entity.claims.P2186.qualifiers = {};

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

$.ajax({
    type: "GET",
    url: `/api/ente`,
    success: function(ente) {
        if (ente) mainObject.entity.claims.P2186.qualifiers.P790 = ente;
    },
    error: function(data) {

    }
});


document.getElementById("sendMaschera").addEventListener("click", function () {
  let label = $("input[name=label]").val();
  if (label) {
      mainObject.entity.label = label;
  }

  let descrizione = $("input[name=descrizione]").val();
  if (descrizione) {
      mainObject.entity.description = descrizione;
  }

  let tipologia = $('#tipologia').find(":selected").val();
  if (tipologia) {
      mainObject.entity.claims.P31 = {};
      mainObject.entity.claims.P31.value = tipologia;
      mainObject.entity.claims.P31.references = [{ P143: 'Q19960422'}];
  }

  mainObject.entity.claims.P17 = "Q38";
  let comune = $('.ui.search').search('get result', $("input[name=comune]").val());
  if (comune) {
      mainObject.entity.claims.P131 = {};
      mainObject.entity.claims.P131.value = comune.id;
      mainObject.entity.claims.P131.references = [{ P143: 'Q19960422'}];
  }

  let lat = $("input[name=lat]").val();
  let long = $("input[name=long]").val();
  if (lat && long) {
      mainObject.entity.claims.P625 = {};
      mainObject.entity.claims.P625.latitude = parseFloat(lat);
      mainObject.entity.claims.P625.longitude = parseFloat(long);
      mainObject.entity.claims.P625.precision = 0.0001;
      mainObject.entity.claims.P625.references = [{ P143: 'Q19960422'}];
  }

  let indirizzo = $("input[name=indirizzo]").val();
  if (indirizzo) {
      mainObject.entity.claims.P6375 = {};
      mainObject.entity.claims.P6375.text = indirizzo;
      mainObject.entity.claims.P6375.language = "it";
      mainObject.entity.claims.P6375.references = [{ P143: 'Q19960422'}];
  }

  let website = $("input[name=sito-web]").val();
  if (website) {
      mainObject.entity.claims.P856 = {};
      mainObject.entity.claims.P856.value = website;
      mainObject.entity.claims.P856.references = [{ P143: 'Q19960422'}];
  }

  //bene immobile italiano
  mainObject.entity.claims.P1435 = {};
  mainObject.entity.claims.P1435.value = "Q26971668";
  mainObject.entity.claims.P1435.references = [{ P143: 'Q19960422'}];

  let date = new Date();
  //data odierna
  mainObject.entity.claims.P2186.qualifiers.P580 = date.toISOString().substring(0, 10);
  //parte coinvolta
  let parte_coinvolta = $('#parte_coinvolta').find(":selected").val();
  if (parte_coinvolta) {
      mainObject.entity.claims.P2186.qualifiers.P518 = parte_coinvolta;
  }
  mainObject.entity.claims.P2186.references = [{ P143: 'Q19960422'}];

  console.log(mainObject);

  let api = "/api/entity/edit";
  if (!mainObject.entity.id) {
      api = "/api/entity/create";
  }

  $.ajax({
      type: "POST",
      url: api,
      contentType: 'application/json',
      data: JSON.stringify(mainObject),
      success: function(data) {
          document.location.href = '/monumenti';
      },
      error: function(err) {
          console.log(err)
      }
  });
});
