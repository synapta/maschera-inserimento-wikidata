$('.ui.search')
  .search({
    apiSettings: {
      url: 'http://localhost:8080/api/suggestion/comune?q={query}'
    },
    fields: {
      results : 'items',
      title   : 'title'
    },
    minCharacters : 3
  })
;
