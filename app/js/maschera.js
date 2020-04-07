let mainObject = {};

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
