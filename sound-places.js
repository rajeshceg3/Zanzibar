// Quiet environmental synthesis, not recordings or verified species calls.
export const SOUND_PLACES=[
 {id:'lagoon',beds:[{type:'surf',params:{period:5,lowpass:1400,swash:.2},gain:.25},{type:'wind',params:{baseCutoff:800},gain:.18}],voices:[{kind:'gull',weight:1,gain:.09}],voiceGap:[25,45]},
 {id:'town',beds:[{type:'wind',params:{baseCutoff:450,gustDepth:.4},gain:.25}],voices:[{kind:'dove',weight:1,gain:.09}],voiceGap:[28,48]},
 {id:'grove',beds:[{type:'rustle',params:{},gain:.24},{type:'wind',params:{baseCutoff:750},gain:.15},{type:'insects',params:{},gain:.08}],voices:[],voiceGap:[25,45]},
 {id:'night',beds:[{type:'surf',params:{period:9,lowpass:650,swash:.35},gain:.3},{type:'wind',params:{baseCutoff:750},gain:.17}],voices:[],voiceGap:[25,45]},
];
