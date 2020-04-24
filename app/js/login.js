$(function () {
    $('#error .close')
    .on('click', function() {
      $(this).closest('.message').transition('fade');
    });
    if (window.location.search.includes('error')) {
        $('#error').removeClass('hidden');
    }
});