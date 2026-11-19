/** Trois formations isolées dans trois classeurs, moteur partagé avec Hydrologie. */
const COURSE_CONFIG=Object.freeze({"analyse-chimie":{"sheet":"1lUDjns9tspm0LFKi4oJOp3_mLmQ2JilySBvSJtR6h9k","title":"Analyse — L1 Chimie","chapters":["Nombres réels et raisonnement","Fonctions numériques d’une variable","Suites numériques","Limites et continuité","Dérivation et étude des fonctions","Développements limités et approximations","Primitives et intégrales","Équations différentielles élémentaires","Fonctions de plusieurs variables"]},"analyse-environnement":{"sheet":"1GOhNpklObdaIeTmxvw1MnCF-kGqoLdqgVMVBzRw3gmo","title":"Analyse — Tronc commun Environnement","chapters":["Fonctions usuelles","Calcul différentiel","Calcul intégral","Suites numériques","Séries numériques","Séries de fonctions et séries entières","Séries de Fourier","Équations différentielles par séries entières"]},"algebre-chimie":{"sheet":"1I5qmP0wA9Lf6yr5nnZAVj1HKEFJrs02qiXPvZdejHE0","title":"Algèbre — L1 Chimie","chapters":["Ensembles, applications et raisonnement","Nombres complexes et polynômes","Espaces vectoriels","Matrices et calcul matriciel","Systèmes d’équations linéaires","Introduction aux groupes"]}});
let COURSE_ACTIVE='';
function cs_course_(){const cfg=COURSE_CONFIG[COURSE_ACTIVE];if(!cfg)throw new Error('Formation inconnue.');return cfg;}
function cs_setCourse_(slug){if(!Object.prototype.hasOwnProperty.call(COURSE_CONFIG,String(slug)))throw new Error('Formation invalide.');COURSE_ACTIVE=String(slug);}
/**
 * ce cours — moteur d'évaluation privé (Google Apps Script V8).
 * Le dépôt GitHub peut être public : ne jamais placer d'identifiants, de clés
 * privées, de listes d'étudiants ni de questions d'examen dans ce fichier.
 *
 * Propriétés du script à configurer :
 *   SPREADSHEET_ID, TEACHER_EMAIL, GOOGLE_CLIENT_ID.
 */
/**
 * Le formulaire OAuth vit sur GitHub Pages (origine autorisée dans Google Cloud).
 * Cette page est uniquement le relais privé des appels google.script.run.
 * Le nonce lie le cadre Apps Script à l'onglet GitHub qui l'a ouvert.
 */
function cs_include_(name) {return HtmlService.createHtmlOutputFromFile(name).getContent();}
function cs_prop_(name) {if(name==='SPREADSHEET_ID')return cs_course_().sheet;const value=PropertiesService.getScriptProperties().getProperty(name);if(!value)throw new Error('Configuration manquante : '+name);return value;}
function cs_db_() {return SpreadsheetApp.openById(cs_prop_('SPREADSHEET_ID'));}
function cs_tab_(name) {const tab=cs_db_().getSheetByName(name);if(!tab)throw new Error('Feuille manquante : '+name);return tab;}
function cs_records_(name) {const values=cs_tab_(name).getDataRange().getValues();if(values.length<2)return [];const header=values[0].map(String);return values.slice(1).map((row,i)=>{const item={_row:i+2};header.forEach((h,j)=>item[h]=row[j]);return item;}).filter(x=>String(x[header[0]]||'').trim());}
function cs_find_(name,id,key) {return cs_records_(name).find(x=>String(x[key])===String(id));}
function cs_patch_(name,row,fields) {const header=TABLES[name];const tab=cs_tab_(name);Object.keys(fields).forEach(key=>{const idx=header.indexOf(key);if(idx<0)throw new Error('Colonne inconnue : '+key);tab.getRange(row,idx+1).setValue(fields[key]);});}
function cs_append_(name,values) {cs_tab_(name).appendRow(TABLES[name].map(key=>values[key]===undefined?'':values[key]));}
function cs_lock_(task) {const lock=LockService.getScriptLock();lock.waitLock(20000);try{return task();}finally{lock.releaseLock();}}
function cs_text_(value,max) {return String(value||'').trim().slice(0,max||500);}
function cs_yes_(value) {return value===true||value===1||String(value).trim().toLowerCase()==='oui'||String(value).trim().toLowerCase()==='true';}
function cs_iso_() {return new Date().toISOString();}
function cs_shuffle_(data) {const items=data.slice();for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=items[i];items[i]=items[j];items[j]=t;}return items;}

/** Valide un ID Token Google ; tokeninfo sert ici à l'amorçage gratuit.
 * Pour un déploiement à forte charge, utiliser un validateur JWT avec clés Google.
 */
function cs_googleIdentity_(idToken) {
  if(typeof idToken!=='string'||idToken.length<100||idToken.length>6000)throw new Error('Jeton de connexion invalide.');
  const url='https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(idToken);
  const response=UrlFetchApp.fetch(url,{muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw new Error('Connexion Google non vérifiée.');
  const payload=JSON.parse(response.getContentText());
  if(payload.aud!==cs_prop_('GOOGLE_CLIENT_ID')||!['accounts.google.com','https://accounts.google.com'].includes(payload.iss)||Number(payload.exp)*1000<Date.now()||String(payload.email_verified)!=='true')throw new Error('Identité Google non valide.');
  const email=String(payload.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Adresse e-mail Google invalide.');
  return {email,sub:String(payload.sub||'')};
}
function cs_signIn(idToken) {
  const identity=cs_googleIdentity_(idToken),email=identity.email,admin=email===cs_prop_('TEACHER_EMAIL').toLowerCase();
  const student=cs_records_('ETUDIANTS').find(s=>String(s.email).toLowerCase()===email&&cs_yes_(s.actif));
  if(!admin&&!student)throw new Error('Votre adresse Gmail ne figure pas dans la liste des étudiants inscrits.');
  if(student&&student.google_sub&&String(student.google_sub)!==identity.sub)throw new Error('Ce compte Gmail ne correspond pas au compte initialement inscrit.');
  if(student&&!student.google_sub)cs_lock_(()=>{const row=cs_records_('ETUDIANTS').find(x=>String(x.email).toLowerCase()===email);if(row&&!row.google_sub){cs_tab_('ETUDIANTS').getRange(row._row,7).setNumberFormat('@');cs_patch_('ETUDIANTS',row._row,{google_sub:identity.sub});}});
  const session=Utilities.getUuid();const profile={email,role:admin?'teacher':'student',name:admin?'M. Bakary TRAORE':(student.prenom+' '+student.nom).trim(),groupe:admin?'':String(student.groupe||'')};
  CacheService.getScriptCache().put('course-session:'+COURSE_ACTIVE+':'+session,JSON.stringify(profile),21600);
  return {session,profile};
}
function cs_user_(session,teacher) {const raw=CacheService.getScriptCache().get('course-session:'+COURSE_ACTIVE+':'+cs_text_(session,80));if(!raw)throw new Error('Session expirée. Connectez-vous à nouveau.');const user=JSON.parse(raw);if(teacher&&user.role!=='teacher')throw new Error('Accès réservé à l’enseignant.');return user;}
function cs_examGroupAllowed_(exam,user) {return !String(exam.groupe||'').trim()||String(exam.groupe).trim().toLowerCase()===String(user.groupe||'').trim().toLowerCase();}
function cs_examState_(exam,now) {
  if(!cs_yes_(exam.actif))return 'brouillon';
  const start=String(exam.ouverture_iso||'').trim(),end=String(exam.fermeture_iso||'').trim();
  const from=start?Date.parse(start):-Infinity,to=end?Date.parse(end):Infinity;
  if(Number.isNaN(from)||Number.isNaN(to)||to<=from)return 'indisponible';
  const time=now===undefined?Date.now():now;
  return time<from?'a_venir':time>=to?'terminee':'ouverte';
}
function cs_visible_(exam,user) {return cs_examGroupAllowed_(exam,user)&&cs_examState_(exam)==='ouverte';}
function cs_revisionDashboard_() {
  const enrolled=cs_records_('ETUDIANTS').filter(s=>cs_yes_(s.actif)&&String(s.email||'').trim());
  const attempts=cs_records_('AUTO_TENTATIVES');
  const people=new Map(),now=Date.now(),week=now-7*86400000,month=now-30*86400000;
  enrolled.forEach(s=>{
    const email=String(s.email).trim().toLowerCase();
    people.set(email,{email,nom:[s.prenom,s.nom].filter(Boolean).join(' '),matricule:String(s.matricule||''),inscrit:true,commencees:0,terminees:0,septJours:0,trenteJours:0,derniere:'',totalNotes:0});
  });
  attempts.forEach(a=>{
    const email=String(a.email||'').trim().toLowerCase();if(!email)return;
    if(!people.has(email))people.set(email,{email,nom:'',matricule:'',inscrit:false,commencees:0,terminees:0,septJours:0,trenteJours:0,derniere:'',totalNotes:0});
    const p=people.get(email),debut=String(a.debut_iso||'');p.commencees++;
    if(debut>p.derniere)p.derniere=debut;
    const time=Date.parse(debut);if(Number.isFinite(time)&&time>=week)p.septJours++;
    if(Number.isFinite(time)&&time>=month)p.trenteJours++;
    if(String(a.statut)==='TERMINE'){p.terminees++;p.totalNotes+=Number(a.note_sur_10)||0;}
  });
  const rows=[...people.values()].map(({totalNotes,...p})=>({...p,moyenne:p.terminees?Math.round(10*totalNotes/p.terminees)/10:null}))
    .sort((a,b)=>Number(b.inscrit)-Number(a.inscrit)||a.commencees-b.commencees||a.email.localeCompare(b.email));
  return {rows,summary:{inscrits:enrolled.length,sansTentative:rows.filter(p=>p.inscrit&&!p.commencees).length,actifs7j:rows.filter(p=>p.inscrit&&p.septJours>0).length,visiteurs:rows.filter(p=>!p.inscrit).length}};
}
function cs_getDashboard(session) {
  const user=cs_user_(session);const exams=cs_records_('EVALUATIONS');const attempts=cs_records_('TENTATIVES');
  if(user.role==='teacher')return {role:'teacher',name:user.name,exams:exams.map(({_row,...r})=>r),attempts:attempts.map(({questions_json,reponses_json,_row,...r})=>r),revisions:cs_revisionDashboard_(),sheetUrl:'https://docs.google.com/spreadsheets/d/'+cs_prop_('SPREADSHEET_ID')+'/edit'};
  // La programmation publiée est consultable avant l'ouverture, sans jamais
  // exposer les questions, réponses, étudiants, notes ou brouillons.
  const planned=exams.filter(ex=>cs_yes_(ex.actif)&&cs_examGroupAllowed_(ex,user))
    .map(ex=>({id:String(ex.id),titre:String(ex.titre),chapitres:String(ex.chapitres),niveau:String(ex.niveau),nb_questions:Number(ex.nb_questions),duree_minutes:Number(ex.duree_minutes),tentatives_max:Number(ex.tentatives_max),ouverture_iso:String(ex.ouverture_iso||''),fermeture_iso:String(ex.fermeture_iso||''),etat:cs_examState_(ex)}))
    .filter(ex=>ex.etat!=='indisponible')
    .sort((a,b)=>(a.etat==='ouverte'?0:a.etat==='a_venir'?1:2)-(b.etat==='ouverte'?0:b.etat==='a_venir'?1:2)||(Date.parse(a.ouverture_iso)||0)-(Date.parse(b.ouverture_iso)||0));
  return {role:'student',name:user.name,exams:planned,attempts:attempts.filter(x=>String(x.email).toLowerCase()===user.email).map(({questions_json,reponses_json,_row,...r})=>r).reverse().slice(0,40)};
}
function cs_chapters_(value) {
  // Le séparateur « , » est parfois transformé en séparateur décimal par
  // Google Sheets (fr_FR) : une ancienne valeur « 2,3 » devient 2.3.
  return String(value).split(/[,.;|]/).map(x=>x.trim()).filter(x=>/^[1-9]$/.test(x));
}
function cs_bank_(chapters,level,mode) {
  const choices=cs_chapters_(chapters);
  // L'enseignant a choisi de réutiliser la banque publique d'entraînement
  // pour les examens officiels ; les questions ne sont pas confidentielles.
  const usages=mode==='exam'?['EXAMEN','ENTRAINEMENT']:['ENTRAINEMENT'];
  return cs_records_('QUESTIONS').filter(q=>cs_yes_(q.actif)&&choices.includes(String(q.chapitre).trim())&&(level==='tous'||String(q.niveau).toLowerCase()===level)&&usages.includes(String(q.usage).toUpperCase())&&['A','B','C','D'].includes(String(q.bonne).toUpperCase()));
}
/** Révisions libres : aucun contrôle de présence dans ETUDIANTS.
 * Le compte Google est toutefois vérifié par le serveur pour suivre chaque adresse.
 */
function cs_verifyPublicPracticeIdentity(idToken) {return {email:cs_googleIdentity_(idToken).email};}
function cs_startPublicPractice(idToken,data) {
  const user=cs_googleIdentity_(idToken),d=data||{},chapter=Number(d.chapter),level=String(d.level||'').toLowerCase(),count=Number(d.count);
  const id=String(d.id||'');
  // Les anciens choix 3 et 9 restent valides pour une tentative déjà ouverte.
  if(!Number.isInteger(chapter)||chapter<1||chapter>cs_course_().chapters.length||!(level==='mixte'||TIME_PER_QUESTION[level])||![3,5,9,10,15].includes(count)||!/^AUTO_[a-f0-9-]{36}$/.test(id))throw new Error('Paramètres de révision invalides.');
  if(!Array.isArray(d.questionIds)||d.questionIds.length!==count)throw new Error('Liste de questions invalide.');
  const pool=cs_bank_(String(chapter),level==='mixte'?'tous':level,'practice'),available=new Set(pool.map(q=>String(q.id)));
  const ids=d.questionIds.map(value=>{
    const original=String(value||'');
    const normalized=chapter===2&&available.has('C2'+original)?'C2'+original:original;
    if(!available.has(normalized))throw new Error('Question absente de la banque du chapitre '+chapter+'.');
    return normalized;
  });
  if(new Set(ids).size!==count)throw new Error('Questions répétées dans la tentative.');
  return cs_lock_(()=>{
    const existing=cs_find_('AUTO_TENTATIVES',id,'id');
    if(existing){if(String(existing.email)!==user.email)throw new Error('Identifiant de tentative déjà utilisé.');return {id,email:user.email,alreadyStarted:true};}
    cs_append_('AUTO_TENTATIVES',{id,email:user.email,debut_iso:cs_iso_(),chapitre:chapter,niveau:level,nb_questions:count,statut:'EN_COURS',questions_json:JSON.stringify(ids)});
    return {id,email:user.email};
  });
}
function cs_finishPublicPractice(idToken,id,answers) {
  const user=cs_googleIdentity_(idToken),key=String(id||''),responses=answers&&typeof answers==='object'&&!Array.isArray(answers)?answers:{};
  return cs_lock_(()=>{
    const attempt=cs_find_('AUTO_TENTATIVES',key,'id');
    if(!attempt||String(attempt.email)!==user.email)throw new Error('Tentative de révision non autorisée.');
    if(String(attempt.statut)==='TERMINE')return {id:key,note:Number(attempt.note_sur_10),correct:Number(attempt.nb_bonnes),count:Number(attempt.nb_questions),alreadyFinished:true};
    const ids=JSON.parse(String(attempt.questions_json||'[]')),bank=new Map(cs_records_('QUESTIONS').map(q=>[String(q.id),q]));
    let correct=0;
    ids.forEach(qid=>{
      const q=bank.get(qid);if(!q)throw new Error('Question introuvable : '+qid);
      const choice=String(responses[qid]||(qid.startsWith('C2')?responses[qid.slice(2)]:'')||'').toUpperCase();
      if(choice===String(q.bonne).toUpperCase())correct++;
    });
    const note=Math.round(1000*correct/ids.length)/100;
    cs_patch_('AUTO_TENTATIVES',attempt._row,{fin_iso:cs_iso_(),nb_bonnes:correct,note_sur_10:note,statut:'TERMINE'});
    return {id:key,note,correct,count:ids.length};
  });
}
function cs_selectQuestions_(pool,level,count,mode) {
  if(mode!=='exam'||level!=='tous')return cs_shuffle_(pool).slice(0,count);
  // Pour 10 QCM : 3 faciles, 4 moyens et 3 difficiles, mélangés.
  const third=Math.floor(count/3);
  const target={facile:third+(count%3===2?1:0),moyen:third+(count%3>=1?1:0),difficile:third};
  const chosen=[];
  for(const difficulty of ['facile','moyen','difficile']) {
    const candidates=cs_shuffle_(pool.filter(q=>String(q.niveau).toLowerCase()===difficulty));
    chosen.push(...candidates.slice(0,target[difficulty]));
  }
  // En présence de catégories moins fournies, compléter sans doublon.
  const used=new Set(chosen.map(q=>String(q.id)));
  chosen.push(...cs_shuffle_(pool.filter(q=>!used.has(String(q.id)))).slice(0,count-chosen.length));
  return cs_shuffle_(chosen);
}
function cs_publicQuestion_(q,order) {return {id:String(q.id),text:String(q.enonce),choices:order.map(k=>({id:k,text:String(q[k.toLowerCase()])}))};}
function cs_buildAttempt_(user,mode,evalId,chapters,level,count,minutes,maxAttempts,closeAt) {
  if(!Number.isInteger(count)||count<1||count>40||!Number.isFinite(minutes)||minutes<1||minutes>180)throw new Error('Paramètres d’évaluation invalides.');
  return cs_lock_(()=>{
    if(mode==='exam'&&cs_records_('TENTATIVES').filter(t=>t.email===user.email&&t.evaluation_id===evalId).length>=maxAttempts)throw new Error('Nombre de tentatives autorisées atteint.');
    const pool=cs_bank_(chapters,level,mode);if(pool.length<count)throw new Error('Banque insuffisante : '+pool.length+' question(s) disponibles pour '+count+' demandées.');
    const selected=cs_selectQuestions_(pool,level,count,mode).map(q=>({id:String(q.id),order:cs_shuffle_(['A','B','C','D'])}));
    const now=new Date();const close=closeAt?Date.parse(closeAt):Infinity;
    if(!Number.isFinite(close)&&closeAt)throw new Error('Date de fermeture invalide.');
    const end=new Date(Math.min(now.getTime()+minutes*60000,close));const id=Utilities.getUuid();
    if(end.getTime()<=now.getTime())throw new Error('Cette évaluation est fermée.');
    cs_append_('TENTATIVES',{id,email:user.email,evaluation_id:evalId,mode,debut_iso:now.toISOString(),expiration_iso:end.toISOString(),statut:'EN_COURS',nb_questions:count,questions_json:JSON.stringify(selected),reponses_json:'{}',dernier_enregistrement_iso:now.toISOString()});
    const byId=new Map(pool.map(q=>[String(q.id),q]));
    return {id,deadline:end.toISOString(),questions:selected.map(entry=>cs_publicQuestion_(byId.get(entry.id),entry.order)),mode};
  });
}
function cs_startPractice(session,chapter,level,count) {
  const user=cs_user_(session);if(user.role==='teacher')throw new Error('Utilisez un compte étudiant pour tester une tentative.');
  const lv=cs_text_(level,20);if(!TIME_PER_QUESTION[lv])throw new Error('Niveau inconnu.');
  const chap=cs_text_(chapter,10);if(!/^[1-9]$/.test(chap))throw new Error('Chapitre inconnu.');
  return cs_buildAttempt_(user,'practice','AUTO_CH'+chap+'_'+lv,chap,lv,Number(count),Math.ceil(Number(count)*TIME_PER_QUESTION[lv]/60),999999);
}
function cs_startExam(session,evalId) {
  const user=cs_user_(session);if(user.role==='teacher')throw new Error('Utilisez un compte étudiant.');
  const exam=cs_find_('EVALUATIONS',cs_text_(evalId,80),'id');if(!exam||!cs_visible_(exam,user))throw new Error('Évaluation fermée ou inaccessible.');
  return cs_buildAttempt_(user,'exam',String(exam.id),String(exam.chapitres),String(exam.niveau),Number(exam.nb_questions),Number(exam.duree_minutes),Number(exam.tentatives_max),exam.fermeture_iso);
}
function cs_cleanAnswers_(attempt,answers) {if(!answers||typeof answers!=='object'||Array.isArray(answers))return {};const selected=JSON.parse(attempt.questions_json);const safe={};selected.forEach(item=>{const x=String(answers[item.id]||'').toUpperCase();if(item.order.includes(x))safe[item.id]=x;});return safe;}
function cs_saveDraft(session,id,answers) {
  const user=cs_user_(session);return cs_lock_(()=>{const attempt=cs_find_('TENTATIVES',cs_text_(id,80),'id');if(!attempt||String(attempt.email)!==user.email)throw new Error('Tentative inaccessible.');if(attempt.statut!=='EN_COURS')return {saved:false,closed:true};if(Date.now()>Date.parse(attempt.expiration_iso))return {saved:false,expired:true};const safe=cs_cleanAnswers_(attempt,answers);cs_patch_('TENTATIVES',attempt._row,{reponses_json:JSON.stringify(safe),dernier_enregistrement_iso:cs_iso_()});return {saved:true};});
}
function cs_submitAttempt(session,id,answers) {
  const user=cs_user_(session);return cs_lock_(()=>{
    const attempt=cs_find_('TENTATIVES',cs_text_(id,80),'id');if(!attempt||String(attempt.email)!==user.email)throw new Error('Tentative inaccessible.');
    if(attempt.statut!=='EN_COURS')return {note:Number(attempt.note_sur_10),correct:Number(attempt.nb_bonnes),count:Number(attempt.nb_questions),alreadySubmitted:true};
    const expired=Date.now()>Date.parse(attempt.expiration_iso);const saved=JSON.parse(attempt.reponses_json||'{}');const selected=JSON.parse(attempt.questions_json);
    const provided=expired?saved:cs_cleanAnswers_(attempt,answers);const bank=new Map(cs_records_('QUESTIONS').map(q=>[String(q.id),q]));
    let correct=0;selected.forEach(item=>{const q=bank.get(item.id);if(!q)throw new Error('Question introuvable : '+item.id);if(String(provided[item.id]||'')===String(q.bonne).toUpperCase())correct++;});
    const count=selected.length;const note=Math.round(100*(10*correct/count))/100;const now=cs_iso_();
    cs_patch_('TENTATIVES',attempt._row,{reponses_json:JSON.stringify(provided),statut:expired?'TERMINE_TEMPS':'TERMINE',fin_iso:now,note_sur_10:note,nb_bonnes:correct,dernier_enregistrement_iso:now});
    // Aucune notification par e-mail pour l'auto-évaluation : score visible à l'écran.
    // Les examens officiels conservent, pour l'instant, leur notification prévue.
    if(attempt.mode==='exam'){
      const email=user.email;cs_append_('EMAILS',{tentative_id:id,email,objet:'Résultat ce cours — '+attempt.evaluation_id,corps:'Bonjour,\n\nVotre tentative '+id+' est terminée.\nNote : '+note+'/10 ('+correct+'/'+count+' réponses correctes).\nDate : '+now+'\n\nM. Bakary TRAORE',statut:'EN_ATTENTE'});
    }
    const output={note,correct,count,expired,attemptId:id};
    if(attempt.mode==='practice'){output.explanations=selected.map(item=>{const q=bank.get(item.id);return {id:item.id,answer:String(q.bonne),explanation:String(q.explication),good:provided[item.id]===String(q.bonne).toUpperCase()};});}
    return output;
  });
}
function cs_adminCreateExam(session,data) {
  cs_user_(session,true);const d=data||{};const chapters=Array.isArray(d.chapters)?d.chapters.map(String).filter(x=>/^[1-9]$/.test(x)):[];if(!chapters.length)throw new Error('Choisissez au moins un chapitre.');
  const level=cs_text_(d.level,20);if(!['facile','moyen','difficile','tous'].includes(level))throw new Error('Difficulté invalide.');
  const count=Number(d.count),minutes=Number(d.minutes),limit=Number(d.maxAttempts);if(!Number.isInteger(count)||count<1||count>40||!Number.isInteger(minutes)||minutes<1||minutes>180||!Number.isInteger(limit)||limit<1||limit>10)throw new Error('Nombre, durée ou tentatives invalides.');
  const start=cs_text_(d.openAt,60),end=cs_text_(d.closeAt,60);if(start&&!Number.isFinite(Date.parse(start)))throw new Error('Date d’ouverture invalide.');if(end&&!Number.isFinite(Date.parse(end)))throw new Error('Date de fermeture invalide.');if(start&&end&&Date.parse(end)<=Date.parse(start))throw new Error('Fermeture antérieure à l’ouverture.');
  const chapterValue=[...new Set(chapters)].join(';');
  const id='EXAM_'+Utilities.getUuid().slice(0,8).toUpperCase();return cs_lock_(()=>{cs_append_('EVALUATIONS',{id,titre:cs_text_(d.title,100)||cs_course_().title,chapitres:chapterValue,niveau:level,nb_questions:count,duree_minutes:minutes,ouverture_iso:start?new Date(start).toISOString():'',fermeture_iso:end?new Date(end).toISOString():'',actif:false,tentatives_max:limit,correction_immediate:false,groupe:cs_text_(d.group,50)});return {id,enabled:false,availableQuestions:cs_bank_(chapterValue,level,'exam').length};});
}
function cs_adminToggleExam(session,id,enabled) {cs_user_(session,true);return cs_lock_(()=>{const ex=cs_find_('EVALUATIONS',cs_text_(id,80),'id');if(!ex)throw new Error('Évaluation introuvable.');if(enabled&&cs_bank_(ex.chapitres,ex.niveau,'exam').length<Number(ex.nb_questions))throw new Error('Banque de QCM insuffisante : vérifiez les chapitres, le niveau et le nombre de questions.');if(enabled&&cs_examState_({...ex,actif:true})==='indisponible')throw new Error('Dates de programmation invalides : corrigez le calendrier avant publication.');cs_patch_('EVALUATIONS',ex._row,{actif:Boolean(enabled)});return {id,enabled:Boolean(enabled)};});}
/** À exécuter une fois manuellement dans l'éditeur Apps Script par le propriétaire. */
/** Un envoi par étudiant et par tentative, dans la limite du quota Gmail réel.
 * Le verrou n'est pas conservé pendant le transfert réseau des e-mails.
 */
function cs_processMailQueue_() {
  let sent=0,quota=MailApp.getRemainingDailyQuota();
  for(let i=0;i<20&&quota>0;i++){
    const next=cs_lock_(()=>{const row=cs_records_('EMAILS').find(x=>x.statut==='EN_ATTENTE');if(!row)return null;cs_patch_('EMAILS',row._row,{statut:'EN_COURS',date_envoi:cs_iso_()});return row;});
    if(!next)break;
    // Même une ancienne notification d'entraînement en attente ne doit jamais partir.
    const attempt=cs_find_('TENTATIVES',String(next.tentative_id),'id');
    if(!attempt||attempt.mode!=='exam'||String(attempt.email).toLowerCase()!==String(next.email).toLowerCase()){
      cs_lock_(()=>cs_patch_('EMAILS',next._row,{statut:'IGNORE',date_envoi:cs_iso_()}));
      continue;
    }
    try{MailApp.sendEmail(String(next.email),String(next.objet),String(next.corps));cs_lock_(()=>cs_patch_('EMAILS',next._row,{statut:'ENVOYE',date_envoi:cs_iso_()}));sent++;quota--;}
    catch(error){cs_lock_(()=>cs_patch_('EMAILS',next._row,{statut:'ERREUR',date_envoi:cs_text_(error.message,200)}));}
  }
  return {sent,remainingQuota:quota};
}
/** À exécuter une fois seulement si le classeur a été créé sans onglets. */
function cs_initializeMissingSheets_() {const db=cs_db_();Object.keys(TABLES).forEach(name=>{let sheet=db.getSheetByName(name);if(!sheet){sheet=db.insertSheet(name);sheet.appendRow(TABLES[name]);sheet.setFrozenRows(1);}});}

function courseSignIn(slug,idToken){cs_setCourse_(slug);return cs_signIn(idToken);}

function courseGetDashboard(slug,session){cs_setCourse_(slug);return cs_getDashboard(session);}

function courseStartExam(slug,session,evalId){cs_setCourse_(slug);return cs_startExam(session,evalId);}

function courseSaveDraft(slug,session,id,answers){cs_setCourse_(slug);return cs_saveDraft(session,id,answers);}

function courseSubmitAttempt(slug,session,id,answers){cs_setCourse_(slug);return cs_submitAttempt(session,id,answers);}

function courseAdminCreateExam(slug,session,data){cs_setCourse_(slug);return cs_adminCreateExam(session,data);}

function courseAdminToggleExam(slug,session,id,enabled){cs_setCourse_(slug);return cs_adminToggleExam(session,id,enabled);}

function courseVerifyPublicPracticeIdentity(slug,idToken){cs_setCourse_(slug);return cs_verifyPublicPracticeIdentity(idToken);}

function courseStartPublicPractice(slug,idToken,data){cs_setCourse_(slug);return cs_startPublicPractice(idToken,data);}

function courseFinishPublicPractice(slug,idToken,id,answers){cs_setCourse_(slug);return cs_finishPublicPractice(idToken,id,answers);}

/** Run once after deployment if exam result e-mails are desired. */
function installAllCourseMailTrigger_(){ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='processAllCourseMail_').forEach(ScriptApp.deleteTrigger);ScriptApp.newTrigger('processAllCourseMail_').timeBased().everyHours(1).create();}
function processAllCourseMail_(){for(const slug of Object.keys(COURSE_CONFIG)){cs_setCourse_(slug);cs_processMailQueue_();}}

/** Safe read-only deployment check, available in the Apps Script Run menu. */
function validateCourseBanks_(){const result={};for(const slug of Object.keys(COURSE_CONFIG)){cs_setCourse_(slug);const all=cs_records_('QUESTIONS');const perChapter=COURSE_CONFIG[slug].chapters.map((_,i)=>all.filter(q=>Number(q.chapitre)===i+1).length);result[slug]={total:all.length,perChapter,valid:all.length===30*perChapter.length&&perChapter.every(n=>n===30)};}console.log(JSON.stringify(result));return result;}
