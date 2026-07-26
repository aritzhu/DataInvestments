const { fetchCompanyFacts } = require('./src/services/sec.js');
fetchCompanyFacts('0001031535')
  .then(d => {
    console.log('Facts keys:', Object.keys(d.facts));
    console.log('IFRS keys:', Object.keys(d.facts['ifrs-full'] || {}));
    const ifrs = d.facts['ifrs-full'];
    if (ifrs) {
      Object.keys(ifrs).forEach(t => {
        console.log(t, ifrs[t].units);
      });
    }
  })
  .catch(err => console.error('Error:', err.message));
