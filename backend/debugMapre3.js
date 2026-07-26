const { fetchCompanyFacts } = require('./sec');
(async()=> {
  try {
    const data = await fetchCompanyFacts('0001031535');
    console.log('Facts keys:', Object.keys(d.facts));
    console.log('IFRS tags with units:', Object.keys(d.facts['ifrs-full'] || {}));
    const ifrs = d.facts['ifrs-full'];
    if (ifrs) {
      const tags = Object.keys(ifrs);
      tags.forEach(t => {
        const units = ifrs[t].units;
        console.log(`${t}: units`, units);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
