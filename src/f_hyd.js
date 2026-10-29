
/* ================= 4 液压系统: pump on the PTO, tank on the left rail, valve block on the tailgate, hoses ================= */
function buildHydraulic(st){
  const run = st.pump, A = st.act;
  /* gear pump flanged to the PTO's back face */
  use('ch', 18);
  gR([124, 29.8, 17.8], [118.6, 29.8, 17.8], 1.8, BLU, .7, { sides: 16 });
  gB(119.4, 29, 19.4, 121, 30.6, 20.4, BLU, .4, { ink: .7 });
  gB(121.8, 29, 19.4, 123.4, 30.6, 20.4, BLU, .4, { ink: .7 });
  /* oil tank on two brackets, sight glass, breather/filler, return filter */
  use('ch', 19);
  gB(104, 35, 9.5, 120, 45, 19.5, BLU, .8, { ink: 2, deco: () => onF([0,1,0], () =>
    dpoly([[110, 45.05, 11.5], [111.6, 45.05, 11.5], [111.6, 45.05, 17.5], [110, 45.05, 17.5]], '#d8eef5', .6)
    + dpoly([[110.1, 45.08, 11.6], [111.5, 45.08, 11.6], [111.5, 45.08, 15.2], [110.1, 45.08, 15.2]], '#e8b23a', 0)
    + dline([[105, 45.05, 18.6], [119, 45.05, 18.6]], .5, BLU.d)) });
  for (const xx of [106, 117.4]) gB(xx, RAIL_Y[1], 16.6, xx + 1.6, 35, 19.5, CHS, .4, { ink: .8 });
  gR([108, 40, 19.5], [108, 40, 21], 1.1, ALU, .5);
  gR([116, 40, 19.5], [116, 40, 21.6], 1.6, ALU, .6);
  /* multi-way valve block on the tailgate's left side: five spool sections, five levers */
  use('gate', 20);
  gB(23, 49, 26.5, 33, 51.6, 31.5, BLU, .7, { ink: 1.6, deco: () => onF([0,1,0], () => { let d = '';
    for (let i = 1; i < 5; i++) d += dline([[23 + 2*i, 51.65, 26.8], [23 + 2*i, 51.65, 31.2]], .6, BLU.d); return d; }) });
  for (let i = 0; i < 5; i++){ const xx = 24 + 2*i, on = (A === 'lift' && i === 0) || (A === 'tip' && i === 1) || ((A === 'blade' || A === 'slide') && i === 2) || (A === 'eject' && i === 3) || (A === 'gate' && i === 4);
    gR([xx, 50.3, 31.5], [xx + (on ? 1.2 : 0), 52.4, 35], .22, ALU, .3);
    gR([xx + (on ? 1.2 : 0), 52.4, 35], [xx + (on ? 1.3 : .1), 52.6, 35.6], .55, RED, .3); }
  /* hoses (frame-tagged points; a hose crossing a joint just flexes) */
  use('ch', 21);
  const c = p => ({ fr: 'ch', p }), b = p => ({ fr: 'body', p }), g = p => ({ fr: 'gate', p }), l = p => ({ fr: 'lift', p }), a = p => ({ fr: 'arm', p });
  const q = st.pump ? 1 : 0;
  gHose([c([120, 31, 11]), c([112, 34.2, 11]), c([112, 36, 9.8])], q, -1, .7);                                       // suction: tank -> pump
  gHose([c([120.2, 29.8, 16]), c([120, 31, 11])], q, -1, .7);
  gHose([c([122.6, 29.8, 20.4]), c([122.6, 29.8, 15.6]), c([116, 29.8, 15.6]), c([46, 29.8, 15.6]), b([41.4, 34, 22.2]), b([40.4, 49.5, 23.6]), g([36.5, 49.7, 25]), g([33.2, 50.3, 29])], q, 1);   // pressure: pump -> valve
  gHose([g([33.2, 50.8, 27.3]), g([36.5, 50.2, 24.2]), b([40.2, 50.2, 22.8]), b([42, 46, 21.3]), c([46, 35.2, 18.6]), c([102, 35.2, 18.6]), c([116, 38.6, 21.6]), c([116, 40, 21.6])], q, 1);   // return: valve -> tank
  const on = k => (st.pump && A === k) ? 1 : 0;
  // tailgate lift cylinders (left direct, right across under the floor)
  gHose([g([33.4, 51, 30.4]), g([38.6, 50.9, 31]), b([45.6, 50.4, 31.5])], on('gate'));
  gHose([g([33.4, 51.2, 29.6]), g([38.6, 51.2, 26.5]), b([43.6, 49.6, 22.6]), b([43.6, .6, 22.6]), b([45.6, -.4, 31.5])], on('gate'));
  // packer: slide pair and sweep pair, up the gate side and in over the top
  const { Q } = packerGeo(st), u = slideU, sw = [Q[0] + 16*u[0] - 2*u[1], 34, Q[1] + 16*u[1] + 2*u[0]];
  gHose([g([28, 51.6, 30]), g([27, 49.6, 50]), g([33, 49.4, 60.5]), g([36.4, 44.5, 63])], on('slide'));
  gHose([g([29, 51.6, 30]), g([28.4, 49.5, 50]), g([33.6, 49.2, 59.4]), g([35, 41, 60]), g(sw)], on('blade'));
  // ejector: forward along the box's left bottom chord, round the front wall to the cylinder trunnion
  gHose([g([31, 51.6, 27.4]), g([36, 51.4, 26]), b([42, 49.2, 24.2]), b([130, 49.2, 24.2]), b([135, 46, 25.4]), b([135, 28.5, 30]), b([134.2, 27, 31])], on('eject'));
  // lifter: down the gate corner to the tip cylinders, along the arm to the lift cylinders
  gHose([g([25, 51.6, 27]), g([14, 49.6, 22]), g([10.6, 44, 18.8]), l([7.6, 39.6, 17.4])], on('tip'));
  gHose([g([27, 51.6, 26.8]), g([14.6, 49.4, 21]), g([10.8, 42.5, 18.2]), l([7.4, 37, 19.6]), a([5.2, 34, 26]), a([4.8, 33.2, 8.4])], on('lift'));
}

/* ================= 5 其他部件: control box, operation panel, sill frame, beacons, emergency stops, side guards ================= */
function buildOther(st){
  const work = st.pump || st.busy, blink = work && Math.floor(st.clock*3) % 2 === 0;
  /* 电控系统: control box on the box's left side near the front, its conduit down to the chassis harness */
  use('body', 22, { xo: [0, 12, 4] });
  gB(124, 48.8, 27, 132, 51, 36, matOf('#d6d9d6'), .7, { ink: 1.6, deco: () => onF([0,1,0], () =>
    dline([[124.6, 51.05, 27.6], [131.4, 51.05, 27.6], [131.4, 51.05, 35.4], [124.6, 51.05, 35.4], [124.6, 51.05, 27.6]], .6, '#8a9190')
    + dpoly([[130, 51.08, 30.6], [130.8, 51.08, 30.6], [130.8, 51.08, 32.4], [130, 51.08, 32.4]], RED.m, .4)
    + dpoly([[125.6, 51.08, 33], [128, 51.08, 33], [128, 51.08, 34.4], [125.6, 51.08, 34.4]], '#1d2a26', .4)) });
  gR([128, 50, 27], [128, 49.6, 22.4], .35, RUB, .3);
  /* 操作面板 with an emergency stop, on the tailgate's left rear; the second stop on the right */
  use('gate', 23, { xo: [-10, 10, 0] });
  gB(13.5, 49, 30, 20.5, 50.6, 38.5, matOf('#d6d9d6'), .7, { ink: 1.5, deco: () => onF([0,1,0], () => {
    let d = dpoly([[14.2, 50.65, 35.6], [19.8, 50.65, 35.6], [19.8, 50.65, 37.8], [14.2, 50.65, 37.8]], '#1d2a26', .4);
    const cols = ['#43c25c', '#f4c430', '#43c25c', '#f4c430', '#e8e6df', '#e8e6df'];
    for (let i = 0; i < 6; i++) d += dpoly(on(([u, v]) => [u, 50.66, v], ellUV(15 + (i % 3)*1.6, 33.6 - Math.floor(i/3)*1.9, .55, .55, 10)), cols[i], .35);
    return d; }) });
  use('gate', 25, { xo: [-10, 10, 0] });
  gR([18.9, 50.6, 31.4], [18.9, 51.5, 31.4], .95, RED, .5, { sides: 12 });
  use('gate', 25, { xo: [-10, -10, 0] });
  gB(14, -.6, 33, 18, 1, 37, matOf('#f2c230'), .5, { ink: 1 });
  gR([16, -.6, 35], [16, -1.5, 35], .95, RED, .5, { sides: 12 });
  /* 进料口: the loading-sill frame round the opening (posts, lintel, stainless wear sill) */
  use('gate', 24, { xo: [-14, 0, 0] });
  gB(7.6, 3.6, 25.8, 9, 46.4, 27.6, ALU, .5, { ink: 1.2, deco: () => onF([0,0,1], () => { let d = '';
    for (let y = 5; y < 46; y += 3) d += dline([[7.8, y, 27.62], [8.8, y + 1.5, 27.62]], .4, '#e2483d'); return d; }) });
  for (const [y0, y1] of [[3.6, 5], [45, 46.4]]) gB(7.6, y0, 27.6, 9, y1, 40.6, CHS, .5, { ink: 1 });
  gB(7.6, 3.6, 40.6, 9, 46.4, 42, CHS, .5, { ink: 1 });
  /* 安全装置: beacons on the tailgate top and the cab roof (flashing while working), side guard rails */
  for (const yy of [5, 45]){
    use('gate', 25, { xo: [0, 0, 10] });
    gB(25, yy - 1.6, 64.9, 28.2, yy + 1.6, 65.6, CHS, .4, { ink: .8 });
    gR([26.6, yy, 65.6], [26.6, yy, 68], 1.3, matOf(blink ? '#ffd257' : AMB), .6, { r1: .9 });
  }
  use('cab', 25, { xo: [0, 0, 8] });
  gB(146, 19, 60, 152, 31, 60.8, CHS, .5, { ink: .9 });
  for (const yy of [21.5, 28.5]) gR([149, yy, 60.8], [149, yy, 62.6], 1.2, matOf(blink ? AMB : '#ffd257'), .5, { r1: .9 });
  for (const sg of [-1, 1]){ const yo = sg > 0 ? 48.9 : .4, y1 = sg > 0 ? 49.7 : 1.2, yr = sg > 0 ? RAIL_Y[1] : RAIL_Y[0];
    use('ch', 25, { xo: [0, 12*sg, 0], pull: [0, 8*sg, 0] });
    for (const zz of [12.4, 18.6]) gB(100.5, yo, zz, 138.5, y1, zz + 1.1, ALU, .5, { ink: 1.1, deco: () => onF([0, sg, 0], () => { let d = '';
      for (let x = 102; x < 137; x += 4) d += dpoly([[x, sg > 0 ? 49.75 : .35, zz + .2], [x + 2, sg > 0 ? 49.75 : .35, zz + .2], [x + 2, sg > 0 ? 49.75 : .35, zz + .9], [x, sg > 0 ? 49.75 : .35, zz + .9]], RFL, 0); return d; }) });
    for (const xx of [102, 122.5, 137]){
      gB(xx - .5, Math.min(yo, y1), 12.4, xx + .5, Math.max(yo, y1), 21.2, ALU, .4, { ink: .8 });
      gB(xx - .5, Math.min(y1, yr), 20.2, xx + .5, Math.max(y1, yr), 21.2, CHS, .4, { ink: .8 }); }
  }
}
