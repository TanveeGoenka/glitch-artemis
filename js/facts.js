// Short, surprising facts shown in the info panel.
// Constellations not listed here still work: they get name + data computed from the catalog.
// Every constellation listed here twinkles brighter now and then, to hint "look at me".

export const CONSTELLATION_FACTS = {
  Ori: { title: 'The Hunter', brightest: 'Rigel', area: '594 sq°', best: 'January', facts: [
    'If Betelgeuse replaced our Sun, it would swallow Mars',
    'In 2019 Betelgeuse suddenly dimmed by half: it had burped out a dust cloud',
    'The fuzzy "star" in his sword is a nursery building new suns right now'] },
  UMa: { title: 'The Great Bear', brightest: 'Alioth', area: '1,280 sq°', best: 'April', facts: [
    'Five Big Dipper stars travel together through space like a flock',
    'In 50,000 years the Dipper will be bent out of shape',
    'Mizar and Alcor were once used as an eyesight test'] },
  UMi: { title: 'The Little Bear', brightest: 'Polaris', area: '256 sq°', best: 'June', facts: [
    'Polaris barely moves all night: the sky spins around it',
    'It won\'t be the North Star forever: Earth wobbles like a spinning top',
    'Polaris is really three stars pretending to be one'] },
  Cas: { title: 'The Queen', brightest: 'Schedar', area: '598 sq°', best: 'November', facts: [
    'In 1572 a brand-new "star" blazed here, brighter than Venus',
    'That supernova proved the heavens could change',
    'Seen from Alpha Centauri, our Sun would sit in Cassiopeia'] },
  Sco: { title: 'The Scorpion', brightest: 'Antares', area: '497 sq°', best: 'July', facts: [
    'Antares is so big that 700 Suns could line up across it',
    'The scorpion\'s tail points at the crowded heart of our galaxy',
    'Myth says the scorpion killed Orion, so they never share the sky'] },
  Cru: { title: 'The Southern Cross', brightest: 'Acrux', area: '68 sq° (smallest)', best: 'May', facts: [
    'The smallest constellation, yet it guides sailors to the south',
    'Next to it lies the Coalsack: a dark cloud blocking the stars behind',
    'The Jewel Box cluster here sparkles red, blue and white'] },
  Leo: { title: 'The Lion', brightest: 'Regulus', area: '947 sq°', best: 'April', facts: [
    'Regulus spins so fast it would fly apart if it went 10% faster',
    'Once every 33 years the Leonids can turn into a meteor storm',
    'In 1833 people saw up to 100,000 meteors an hour from here'] },
  Cyg: { title: 'The Swan', brightest: 'Deneb', area: '804 sq°', best: 'September', facts: [
    'Deneb\'s light set off around the time of ancient Egypt\'s pyramids',
    'Cygnus X-1 was the first black hole ever found',
    'The Kepler telescope stared here for 4 years and found 2,600+ planets'] },
  Lyr: { title: 'The Lyre', brightest: 'Vega', area: '286 sq°', best: 'August', facts: [
    'Vega was the first star ever photographed, in 1850',
    'Vega spins so fast it\'s much hotter at its poles than its middle',
    'In "Contact", the alien message comes from Vega'] },
  Tau: { title: 'The Bull', brightest: 'Aldebaran', area: '797 sq°', best: 'January', facts: [
    'Chinese astronomers saw a star explode here in 1054 — visible by day',
    'The Crab Nebula left behind holds a star spinning 30 times a second',
    'The Pleiades appear on the Subaru car logo'] },
  Gem: { title: 'The Twins', brightest: 'Pollux', area: '514 sq°', best: 'February', facts: [
    'Castor looks like one star but is actually six',
    'The Geminid meteors come from an asteroid, not a comet',
    'Pluto was discovered in Gemini in 1930'] },
  CMa: { title: 'The Great Dog', brightest: 'Sirius', area: '380 sq°', best: 'February', facts: [
    'Sirius is the brightest star in the night sky',
    'Ancient Egyptians built their calendar around Sirius rising',
    'Sirius has a tiny partner: a dead star the size of Earth'] },
  And: { title: 'The Chained Princess', brightest: 'Alpheratz', area: '722 sq°', best: 'November', facts: [
    'The Andromeda Galaxy\'s light left it 2.5 million years ago',
    'It\'s six times wider than the Moon — just too faint to notice',
    'It\'s heading our way and will merge with the Milky Way'] },
  Sgr: { title: 'The Archer', brightest: 'Kaus Australis', area: '867 sq°', best: 'August', facts: [
    'Look here and you face the centre of our whole galaxy',
    'A black hole as heavy as 4 million Suns hides there',
    'A cloud here contains alcohol and tastes like raspberries'] },
  Per: { title: 'The Hero', brightest: 'Mirfak', area: '615 sq°', best: 'December', facts: [
    'Algol, the "Demon Star", winks dimmer every 2.9 days',
    'It winks because a fainter star passes in front of it',
    'The August Perseids are dust from Comet Swift–Tuttle'] },
  Aql: { title: 'The Eagle', brightest: 'Altair', area: '652 sq°', best: 'August', facts: [
    'Altair spins once every 9 hours — the Sun takes 27 days',
    'All that spinning has squashed it into an egg shape',
    'In the Qixi legend, Altair and Vega are lovers split by the Milky Way'] },
  Peg: { title: 'The Winged Horse', brightest: 'Enif', area: '1,121 sq°', best: 'October', facts: [
    'The first planet around a Sun-like star was found here in 1995',
    'That planet circles its star in just 4 days',
    'Its discovery won the 2019 Nobel Prize in Physics'] },
  Boo: { title: 'The Herdsman', brightest: 'Arcturus', area: '907 sq°', best: 'June', facts: [
    'Arcturus\' light opened the 1933 Chicago World\'s Fair',
    'Arcturus is an outsider passing through our galaxy\'s disc',
    '"Follow the arc" of the Big Dipper\'s handle to find it'] },
  Car: { title: 'The Keel', brightest: 'Canopus', area: '494 sq°', best: 'March', facts: [
    'Spacecraft lock onto Canopus to know which way they face',
    'In 1843 Eta Carinae blazed into the 2nd brightest star in the sky',
    'It was once part of a giant ship constellation, Argo'] },
  Cen: { title: 'The Centaur', brightest: 'Rigil Kentaurus', area: '1,060 sq°', best: 'May', facts: [
    'Our nearest star, Proxima Centauri, lies here — 4.24 light-years away',
    'Even our fastest spacecraft would take over 6,000 years to get there',
    'Omega Centauri may be the leftover core of an eaten galaxy'] },
  Vir: { title: 'The Maiden', brightest: 'Spica', area: '1,294 sq°', best: 'May', facts: [
    'The first photo of a black hole (2019) was of one in Virgo',
    'That black hole is 6.5 billion times heavier than the Sun',
    'Spica helped ancient astronomers discover Earth\'s wobble'] },
  Aqr: { title: 'The Water Bearer', brightest: 'Sadalsuud', area: '980 sq°', best: 'October', facts: [
    'The Helix Nebula here looks like a giant eye in the sky',
    'TRAPPIST-1, a star with 7 Earth-sized planets, sits in Aquarius',
    'The May Eta Aquariids are crumbs from Halley\'s Comet'] },
  Dra: { title: 'The Dragon', brightest: 'Eltanin', area: '1,083 sq°', best: 'July', facts: [
    'Thuban was the North Star when the pyramids were built',
    'A tunnel in the Great Pyramid may have pointed at it',
    'The Cat\'s Eye Nebula is a dying star shedding its shells'] },
};

// Bright / important stars (HIP catalogue number => facts)
export const STAR_FACTS = {
  32349: { name: 'Sirius', title: 'The Dog Star', dist: '8.6 light-years', type: 'A1 V · white', temp: '9,940 K', radius: '1.7 × Sun', fact: 'It twinkles in rainbow colours when low in the sky' },
  30438: { name: 'Canopus', title: 'Navigator star', dist: '310 light-years', type: 'A9 II · white giant', temp: '7,000 K', radius: '71 × Sun', fact: 'Spacecraft use it to know which way they face' },
  71683: { name: 'Rigil Kentaurus', title: 'Alpha Centauri', dist: '4.37 light-years', type: 'G2 V · Sun-like', temp: '5,800 K', radius: '1.2 × Sun', fact: 'Light from it left when you were 4 years younger' },
  69673: { name: 'Arcturus', title: 'The Bear Guard', dist: '36.7 light-years', type: 'K1.5 III · orange giant', temp: '4,290 K', radius: '25 × Sun', fact: 'Its starlight switched on the 1933 World\'s Fair' },
  91262: { name: 'Vega', title: 'The Harp Star', dist: '25 light-years', type: 'A0 V · white', temp: '9,600 K', radius: '2.4 × Sun', fact: 'In 12,000 years Vega will be our North Star' },
  24608: { name: 'Capella', title: 'The Little Goat', dist: '42.9 light-years', type: 'G · two yellow giants', temp: '4,970 K', radius: '12 × Sun', fact: 'Looks like one star, but it is really four' },
  24436: { name: 'Rigel', title: 'Orion\'s foot', dist: '~860 light-years', type: 'B8 Ia · blue supergiant', temp: '12,100 K', radius: '79 × Sun', fact: 'Shines as bright as 120,000 Suns' },
  37279: { name: 'Procyon', title: 'Before the Dog', dist: '11.5 light-years', type: 'F5 IV · yellow-white', temp: '6,530 K', radius: '2 × Sun', fact: 'Rises just before Sirius, warning that the "dog" is coming' },
  27989: { name: 'Betelgeuse', title: 'Orion\'s shoulder', dist: '~550 light-years', type: 'M1 Ia · red supergiant', temp: '3,600 K', radius: '~760 × Sun', fact: 'When it explodes it may be visible in daylight' },
  97649: { name: 'Altair', title: 'The Flying Eagle', dist: '16.7 light-years', type: 'A7 V · white', temp: '7,700 K', radius: '1.8 × Sun', fact: 'Spins so fast it is squashed like an egg' },
  21421: { name: 'Aldebaran', title: 'Eye of the Bull', dist: '65 light-years', type: 'K5 III · orange giant', temp: '3,900 K', radius: '45 × Sun', fact: 'Pioneer 10 will drift past it in 2 million years' },
  80763: { name: 'Antares', title: 'Heart of the Scorpion', dist: '~550 light-years', type: 'M1.5 Iab · red supergiant', temp: '3,600 K', radius: '~680 × Sun', fact: 'Its name means "rival of Mars" for its red glow' },
  65474: { name: 'Spica', title: 'Ear of Wheat', dist: '250 light-years', type: 'B1 III · blue giant pair', temp: '25,300 K', radius: '7.5 × Sun', fact: 'Two stars so close they pull each other into eggs' },
  37826: { name: 'Pollux', title: 'The Immortal Twin', dist: '33.8 light-years', type: 'K0 III · orange giant', temp: '4,600 K', radius: '9 × Sun', fact: 'A giant planet bigger than Jupiter orbits it' },
  102098: { name: 'Deneb', title: 'Tail of the Swan', dist: '~2,600 light-years', type: 'A2 Ia · white supergiant', temp: '8,500 K', radius: '~200 × Sun', fact: 'The farthest star you can easily see with bare eyes' },
  49669: { name: 'Regulus', title: 'Heart of the Lion', dist: '79 light-years', type: 'B8 IV · blue-white', temp: '12,000 K', radius: '3.1 × Sun', fact: 'Spins so fast it\'s nearly tearing itself apart' },
  11767: { name: 'Polaris', title: 'The North Star', dist: '~430 light-years', type: 'F7 Ib · yellow supergiant', temp: '6,000 K', radius: '38 × Sun', fact: 'Its height above the horizon tells you your latitude' },
  113368: { name: 'Fomalhaut', title: 'Mouth of the Fish', dist: '25 light-years', type: 'A3 V · white', temp: '8,590 K', radius: '1.8 × Sun', fact: 'Wrapped in a giant ring of icy comet dust' },
  7588: { name: 'Achernar', title: 'End of the River', dist: '139 light-years', type: 'B6 V · blue-white', temp: '15,000 K', radius: '~8 × Sun', fact: 'The flattest star known, from spinning so fast' },
};
