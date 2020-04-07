$('#embedpollfileinput').on('change', function () {
    const file = this.files[0];
    const formData = new FormData();
    formData.append('upload', file);
    $.ajax({
        url: '/api/upload',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function () {
            window.location = '/monumenti';
        }
    });
});