export const PARITY_CASES=[
 {name:'quoted commas, multiline values, duplicate headers and IDs',format:'csv',text:'id,name,name\r\n001,"A,B","line\nline"\r\n002,"He said ""hello""", end \r\n'},
 {name:'ragged missing cells and inert formula/HTML',format:'csv',text:'id,,id\n001,=SUM(A1),<img src=x>\n002\n002\n,,'},
 {name:'unicode and quoted terminal newline',format:'csv',text:'clé,valeur\n001," café\n"'},
 {name:'JSON safe scalar types and leading zeros',format:'json',text:'[{"id":"001","stock":7,"ok":true},{"id":"002","stock":null,"ok":false}]'},
 {name:'malformed CSV quoting',format:'csv',text:'id\n"unfinished',invalid:true}
];
export const wideCsv=()=>Array(64).fill('h').join(',')+'\n'+Array(5000).fill(Array(64).fill('x').join(',')).join('\n');
