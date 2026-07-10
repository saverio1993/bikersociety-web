(() => {
  const legacy = document.createElement('script');
  legacy.src = 'https://biker-society-v2-922lzt4v0-saverio2023.vercel.app/script-gram.js';
  legacy.onload = () => {
    const modern = document.createElement('script');
    modern.src = '/bikergram-sociala.js';
    modern.onload = () => {
      const performance = document.createElement('script');
      performance.src = '/biker-performance.js';
      document.head.appendChild(performance);
    };
    document.head.appendChild(modern);
  };
  document.head.appendChild(legacy);
})();
