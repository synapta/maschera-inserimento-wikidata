let mainObject = {};

document.getElementById("sendMaschera").addEventListener("click", function () {

  let comune = $('.ui.search').search('get result', $("input[name=comune]").val());
  if (comune) {
      mainObject.P131 = comune.id;
  }

  let lat = $("input[name=lat]").val();
  let long = $("input[name=long]").val();
  if (lat && long) {
      mainObject.P625 = `Point(${lat}, ${long})`
  }

  console.log(mainObject);
});
