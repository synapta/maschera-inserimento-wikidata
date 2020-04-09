$(function () {
    const template = $('#template-log').html();
    const templateScript = Handlebars.compile(template);
    Handlebars.registerHelper('icon', function () {
        switch (this.action) {
            case 'login':
                return 'key';
            case 'ente':
                return 'building';
            case 'entity':
                return 'edit';
            default:
                return this.action;
        }
    });
    Handlebars.registerHelper('entry', function () {
        switch (this.action) {
            case 'login':
                return ' si è autenticato';
            case 'ente':
                return ' ha scelto l\'ente <a target=\'_black\' href="https://www.wikidata.org/wiki/' + this.target + '">' + this.message + '</a>';
            case 'upload':
                return ' caricato il file ' + this.target;
            case 'entity':
                return ' ha modificato il monumento <a target=\'_black\' href="https://www.wikidata.org/wiki/' + this.target + '">' + this.message + '</a>';
            default:
                return '';
        }
    });
    Handlebars.registerHelper('timeago', function () {
        return timeago.format(this.timestamp + '000', 'it');
    });

    let logPage = 0;

    function getLogPage(page) {
        $.ajax({
            type: 'GET',
            url: '/api/registro',
            data: { 'page': page },
            dataType: 'json',
            success: function (result) {
                const html = templateScript({ data: result });
                $('#list-log').append(html);
            }
        });
    };

    // First page
    getLogPage(logPage++);

    // Next pages
    $(window).scroll(function () {
        if ($(document).height() - $(this).height() == $(this).scrollTop()) {
            getLogPage(logPage++);
        }
    });
});