// To add a new tab later: add one object here + one table in SQL. Public page and admin page both read this.
// f: [column, label, type(text|tel|url|check|select|area), required|options]
const SECTIONS=[
{t:'helpers',label:'🛺 ஆட்டோ · கார்',title:'name',tag:'kind',phone:'phone',img:'image_url',
 show:['area','rate','night_extra','notes'],flag:['night_available','🌙 Night available · இரவு உண்டு','Day only · பகல் மட்டும்'],
 f:[['name','Name','text',1],['kind','Type','select',['Auto','Car','Van','Other']],['phone','Phone','tel'],['area','Area / Stand','text'],
    ['rate','Rate info (day)','text'],['night_available','Night available?','check'],['night_extra','Extra money for night trip','text'],['notes','Notes','area'],['image_url','Picture link (https)','url']]},
{t:'shops',label:'🏪 கடைகள்',title:'name',tag:'category',phone:'phone',img:'image_url',show:['address','hours','notes'],
 f:[['name','Shop name','text',1],['category','Category','text'],['phone','Phone','tel'],['address','Address','text'],['hours','Open hours','text'],['notes','Notes','area'],['image_url','Picture link (https)','url']]},
{t:'emergency',label:'🚨 அவசர உதவி',title:'name',tag:'category',phone:'phone',show:['notes'],
 f:[['name','Name','text',1],['category','Category','select',['Police','Ambulance','Fire','Hospital','EB / Power','Doctor','Other']],['phone','Phone','tel',1],['notes','Notes','area']]},
{t:'temples',label:'🛕 கோயில்கள்',title:'name',img:'image_url',link:['map_url','Open map'],
 show:['morning_time','evening_time','notes'],
 f:[['name','Temple name','text',1],['morning_time','Morning open–close','text'],['evening_time','Evening open–close','text'],['notes','Notes (festival, special days)','area'],['map_url','Google Maps link','url'],['image_url','Picture link (https)','url']]}
];
