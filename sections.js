// To add a new tab later: add one object here + one table in SQL. Public page and admin page both read this.
// f: [column, label, type(text|tel|url|check|select|area), required|options]
const SECTIONS=[
{t:'helpers',label:'🛺 ஆட்டோ · கார்',title:'name',nowa:1,nomap:1,tag:'kind',phone:'phone',img:'image_url',
 show:['area','rate','night_extra','notes'],flag:['night_available','🌙 Night available · இரவு உண்டு','Day only · பகல் மட்டும்'],
 f:[['name','Name','text',1],['kind','Type','select',['Auto','Car','Van','Other']],['phone','Phone','tel'],['area','Area / Stand','text'],
    ['rate','Rate info (day)','text'],['night_available','Night available?','check'],['night_extra','Extra money for night trip','text'],['notes','Notes','area'],['map_url','Google Maps link','url'],['image_url','Picture link (https)','url']]},
{t:'shops',label:'🏪 கடைகள்',title:'name',tag:'category',phone:'phone',img:'image_url',show:['address','hours','notes'],
 f:[['name','Shop name','text',1],['category','Category','text'],['phone','Phone','tel'],['address','Address','text'],['hours','Open hours','text'],['notes','Notes','area'],['map_url','Google Maps link','url'],['image_url','Picture link (https)','url']]},
{t:'emergency',label:'🚨 அவசர உதவி',title:'name',tag:'category',phone:'phone',show:['notes'],
 f:[['name','Name','text',1],['category','Category','select',['Police','Ambulance','Fire','Hospital','EB / Power','Doctor','Other']],['phone','Phone','tel',1],['notes','Notes','area'],['map_url','Google Maps link','url']]},
{t:'temples',label:'🛕 கோயில்கள்',title:'name',phone:'phone',img:'image_url',
 show:['morning_time','evening_time','notes'],
 f:[['name','Temple name','text',1],['phone','Phone','tel'],['morning_time','Morning open–close','text'],['evening_time','Evening open–close','text'],['notes','Notes (festival, special days)','area'],['map_url','Google Maps link','url'],['image_url','Picture link (https)','url']]}
,{t:'local_news',label:'📰 ஊர் செய்தி',title:'title',tag:'category',phone:'phone',img:'image_url',show:['news_date','details'],
 f:[['title','Heading','text',1],['category','Category','select',['Water cut · குடிநீர்','Power cut · மின்தடை','Ration · ரேஷன்','School · பள்ளி','Market rate · விலை','Panchayat · ஊராட்சி','Other']],['news_date','Date / time','text'],['details','Details','area'],['phone','Phone (optional)','tel'],['image_url','Picture link (https)','url']]}
];
