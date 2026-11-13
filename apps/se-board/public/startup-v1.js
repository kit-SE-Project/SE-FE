(function () {
  window.addEventListener('error', function (event) {
    if (!event.target || event.target.tagName !== 'SCRIPT') return;
    var startup = document.getElementById('se-startup');
    var message = document.getElementById('se-startup-message');
    if (!startup || !message) return;
    startup.setAttribute('role', 'alert');
    message.textContent = '화면 파일을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.';
  }, true);
})();
