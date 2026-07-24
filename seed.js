/* Krama seed data.
   This is the starting plan — real epics, real repos, real dates. Once you start
   editing in the app, your saved data takes over and this file is never read again
   (unless you hit "Reset to seed" in Settings). */

const KIND = {
  career:     {label:'Career',     color:'var(--k-career)',     hex:'#9b2c2c'},
  project:    {label:'Project',    color:'var(--k-project)',    hex:'#0072b2'},
  learning:   {label:'Learning',   color:'var(--k-learning)',   hex:'#009e73'},
  personal:   {label:'Personal',   color:'var(--k-personal)',   hex:'#cc79a7'},
  commitment: {label:'Commitment', color:'var(--k-commitment)', hex:'#e69f00'},
};

const STATUS = {
  todo:   {label:'To Do',       hex:'#9a7b5f'},
  doing:  {label:'In Progress', hex:'#9b2c2c'},
  review: {label:'For Review',  hex:'#c2710c'},
  done:   {label:'Done',        hex:'#5f7a3a'},
};

const PEOPLE = {
  Shardul: {hex:'#9b2c2c', initial:'S'},
  Papa:    {hex:'#0072b2', initial:'P'},
};

/* Last push per repo. The GitHub Action in .github/workflows/ overwrites this
   file's counterpart (activity.json) nightly; these are the values as of 22 Jul 2026. */
const SEED_ACTIVITY = {
  'dateshardul/MarketViaGraha': '2026-07-21',
  'dateshardul/atlas':          '2026-07-20',
  'dateshardul/portfolio':      '2026-07-04',
  'dateshardul/nrityabhyas':    '2026-06-14',
  'dateshardul/dinachitran':    '2026-04-23',
  'dateshardul/panchangBot':    '2024-12-19',
};

const SEED = {
  v: 1,
  goal: {
    title: 'Land a role in the global AI market',
    why: 'The portfolio is far stronger than the resume. Close that gap with shipped, ' +
         'verifiable AI work — and get the credentials to match by March 2027.',
    target: '2027-03-31',
  },
  /* hoursPerDay is focused project hours, not hours awake. Be honest here — the whole
     value of velocity comes from planning against real numbers. Sundays are excluded. */
  settings: {hoursPerDay: 5, wipLimit: 3, sprintDays: 14},

  epics: [
    {id:'e-portfolio', title:'Bag End — game portfolio', kind:'project',    repo:'dateshardul/portfolio',      note:'Phases 2–5: interior, character, walk cycle, deploy.'},
    {id:'e-market',    title:'MarketViaGraha',           kind:'project',    repo:'dateshardul/MarketViaGraha', note:'Market intuition using panchang features.'},
    {id:'e-atlas',     title:'Atlas',                    kind:'project',    repo:'dateshardul/atlas',          note:''},
    {id:'e-dina',      title:'Dinachitran',              kind:'project',    repo:'dateshardul/dinachitran',    note:'Production AI pipeline. The strongest resume item.'},
    {id:'e-nritya',    title:'Nrityabhyas — C++ engine', kind:'project',    repo:'dateshardul/nrityabhyas',    note:'C++17 audio engine for Bharatanatyam practice.'},
    {id:'e-bot',       title:'PanchangBot — RAG',        kind:'project',    repo:'dateshardul/panchangBot',    note:'Dormant since 2024. Revive or retire — decide, do not drift.'},
    {id:'e-llm',       title:'Skill — LLM fine-tuning',  kind:'learning',   repo:'',                           note:'Biggest single gap vs. the 2026 market.'},
    {id:'e-cloud',     title:'Skill — Cloud & MLOps',    kind:'learning',   repo:'',                           note:'Everything so far is local or Vercel. Need real AWS/GCP.'},
    {id:'e-career',    title:'Career — resume & applications', kind:'career', repo:'',                         note:'Resume must list the real work, not course projects.'},
    {id:'e-dp',        title:'Date Panchang — team',     kind:'commitment', repo:'',                           note:'Commitments to Vinay & Vedang. Consumes capacity.'},
    {id:'e-arvr',      title:'AR/VR project',            kind:'project',    repo:'',                           note:'With Rutudhwaj. Built in Unity.'},
    {id:'e-personal',  title:'Personal & people',        kind:'personal',   repo:'',                           note:'Loose personal tasks and people to follow up with.'},
  ],

  milestones: [
    {id:'m1', epicId:'e-career',    title:'Resume v2 — rebuilt around real projects', due:'2026-08-05', hard:false, doneAt:''},
    {id:'m2', epicId:'e-portfolio', title:'Bag End Phase 3 — character art + rig',    due:'2026-08-15', hard:false, doneAt:''},
    {id:'m3', epicId:'e-market',    title:'v1 backtest written up publicly',          due:'2026-08-25', hard:false, doneAt:''},
    {id:'m4', epicId:'e-career',    title:'First 10 applications sent',               due:'2026-08-31', hard:false, doneAt:''},
    {id:'m5', epicId:'e-llm',       title:'Fine-tuned Marathi model on HuggingFace',  due:'2026-09-20', hard:false, doneAt:''},
    {id:'m6', epicId:'e-portfolio', title:'Bag End live on shardul.date',             due:'2026-09-30', hard:false, doneAt:''},
    {id:'m7', epicId:'e-cloud',     title:'One project running on AWS or GCP',        due:'2026-10-15', hard:false, doneAt:''},
    {id:'m8', epicId:'e-dina',      title:'Dinachitran pipeline in production',       due:'2026-11-15', hard:true,  doneAt:''},
  ],

  sprints: [
    {id:'s1', n:1, name:'Sprint 1', start:'2026-06-24', end:'2026-07-07', goal:'Get the Bag End vanilla port live and reviewable.', closed:true},
    {id:'s2', n:2, name:'Sprint 2', start:'2026-07-08', end:'2026-07-21', goal:'Character sprite sheet generated and walking on screen.', closed:true},
    {id:'s3', n:3, name:'Sprint 3', start:'2026-07-22', end:'2026-08-04', goal:'Walk cycle proven end-to-end, and the resume finally tells the truth.', closed:false},
  ],

  tasks: [
    /* ---- Sprint 1 (closed) ---- */
    {id:'t01', epicId:'e-portfolio', sprintId:'s1', title:'Port Bag End prototype to vanilla JS in the repo', est:10, status:'done', due:'', doneAt:'2026-07-04', who:'Shardul', note:'', comments:[]},
    {id:'t02', epicId:'e-portfolio', sprintId:'s1', title:'Research the Neighbours-from-Hell art direction', est:4,  status:'done', due:'', doneAt:'2026-07-07', who:'Shardul', note:'Concluded: pre-rendered 3D, not flat cartoon.', comments:[]},
    {id:'t03', epicId:'e-market',    sprintId:'s1', title:'MarketViaGraha — data ingest pipeline',            est:6,  status:'done', due:'', doneAt:'2026-07-02', who:'Shardul', note:'', comments:[]},

    /* ---- Sprint 2 (closed) ---- */
    {id:'t04', epicId:'e-portfolio', sprintId:'s2', title:'Generate character sprite sheet v1',               est:8,  status:'done', due:'', doneAt:'2026-07-15', who:'Shardul', note:'', comments:[]},
    {id:'t05', epicId:'e-portfolio', sprintId:'s2', title:'Wire sprite frames into the walk animation',       est:6,  status:'done', due:'', doneAt:'2026-07-20', who:'Shardul', note:'', comments:[]},
    {id:'t06', epicId:'e-atlas',     sprintId:'s2', title:'Atlas — scaffold repo and first pipeline run',     est:5,  status:'done', due:'', doneAt:'2026-07-20', who:'Shardul', note:'', comments:[]},
    {id:'t07', epicId:'e-market',    sprintId:'s2', title:'Join panchang features onto the price series',     est:5,  status:'done', due:'', doneAt:'2026-07-21', who:'Shardul', note:'', comments:[]},
    {id:'t08', epicId:'e-nritya',    sprintId:'s2', title:'Nrityabhyas — tala detection spike',               est:6,  status:'todo', due:'', doneAt:'', who:'Shardul', note:'Did not get to it in Sprint 2 — carried forward.', comments:[]},

    /* ---- Sprint 3 (active) ---- */
    {id:'t09', epicId:'e-portfolio', sprintId:'s3', title:'Test the walk cycle end-to-end in the browser',    est:4,  status:'doing',  due:'',           doneAt:'', who:'Shardul', note:'Blocks the whole house build — do this first.', comments:[]},
    {id:'t10', epicId:'e-portfolio', sprintId:'s3', title:'Prompt frontal cross-section house render',        est:6,  status:'todo',   due:'',           doneAt:'', who:'Shardul', note:'Dead-on dollhouse cut, NOT 3/4 bird’s-eye.', comments:[]},
    {id:'t11', epicId:'e-portfolio', sprintId:'s3', title:'Composite rooms in code with exact floor lines',   est:8,  status:'todo',   due:'',           doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t12', epicId:'e-career',    sprintId:'s3', title:'Rewrite resume around Dinachitran, PanchangBot, Nrityabhyas', est:5, status:'todo', due:'2026-08-05', doneAt:'', who:'Shardul', note:'Drop the CAD and timetable course projects. Remove TensorFlow/Keras claims with no evidence.', comments:[
      {who:'Papa', text:'Send me the draft before you send it anywhere. We will go through it line by line.', at:'2026-07-21T18:30:00'}
    ]},
    {id:'t13', epicId:'e-llm',       sprintId:'s3', title:'Choose a fine-tuning track and finish module 1',   est:6,  status:'todo',   due:'',           doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t14', epicId:'e-dp',        sprintId:'s3', title:'Dinachitran JSON spec for the Date Panchang app',  est:3,  status:'review', due:'2026-07-31', doneAt:'', who:'Shardul', note:'Vinay is waiting on this.', comments:[]},

    /* ---- Backlog (no sprint yet) ---- */
    {id:'t15', epicId:'e-portfolio', sprintId:'', title:'Phase 4 — polish walk animation timing',      est:6,  status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t16', epicId:'e-portfolio', sprintId:'', title:'Phase 5 — Cloudflare Pages cutover to shardul.date', est:4, status:'todo', due:'', doneAt:'', who:'Shardul', note:'Verify production branch = main, output dir = /', comments:[]},
    {id:'t17', epicId:'e-career',    sprintId:'', title:'Shortlist 30 target companies hiring AI globally', est:4, status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t18', epicId:'e-career',    sprintId:'', title:'Write the Indic-AI positioning story',        est:3,  status:'todo', due:'', doneAt:'', who:'Shardul', note:'Marathi/Sanskrit/Devanagari + IKS is the real differentiator.', comments:[]},
    {id:'t19', epicId:'e-llm',       sprintId:'', title:'Build a Marathi instruction dataset',         est:12, status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t20', epicId:'e-llm',       sprintId:'', title:'Run a LoRA fine-tune and publish the weights', est:10, status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t21', epicId:'e-cloud',     sprintId:'', title:'AWS fundamentals — up to deploying a container', est:8, status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t22', epicId:'e-cloud',     sprintId:'', title:'Deploy Dinachitran on GCP with a scheduler',  est:10, status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t23', epicId:'e-cloud',     sprintId:'', title:'Add evals + observability to one LLM project', est:8, status:'todo', due:'', doneAt:'', who:'Shardul', note:'LLM evals is a named gap. This closes it visibly.', comments:[]},
    {id:'t24', epicId:'e-dina',      sprintId:'', title:'Dinachitran — harden the pipeline for production', est:12, status:'todo', due:'2026-11-15', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t25', epicId:'e-market',    sprintId:'', title:'Backtest harness with walk-forward validation', est:8, status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t26', epicId:'e-bot',       sprintId:'', title:'Decide: revive PanchangBot or archive it',    est:1,  status:'todo', due:'', doneAt:'', who:'Shardul', note:'Untouched since Dec 2024.', comments:[]},
    {id:'t27', epicId:'e-nritya',    sprintId:'', title:'Write up the C++17 audio engine as a case study', est:5, status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t28', epicId:'e-arvr',     sprintId:'', title:'Unity — install and get up to speed on the basics', est:8, status:'todo', due:'', doneAt:'', who:'Shardul', note:'Engine for the AR/VR project with Rutudhwaj.', comments:[]},
    {id:'t29', epicId:'e-personal', sprintId:'', title:'Send a few things to Neel', est:1, status:'todo', due:'', doneAt:'', who:'Shardul', note:'', comments:[]},
    {id:'t30', epicId:'e-personal', sprintId:'', title:"Meeting with Krushanu's father", est:1, status:'todo', due:'', doneAt:'', who:'Shardul', note:'No date yet — set one, then move it to a commitment so it counts against sprint capacity.', comments:[]},
  ],

  /* Commitments that eat capacity but are not backlog work. */
  events: [
    {id:'ev1', title:'Sprint review with Papa', date:'2026-07-26', time:'19:00', hours:1.5, kind:'commitment', who:'Papa',  repeat:'weekly', note:'Show finished work. Not a status update — a demo.'},
    {id:'ev2', title:'Date Panchang team sync', date:'2026-07-23', time:'21:00', hours:1,   kind:'commitment', who:'Vinay, Vedang', repeat:'weekly', note:''},
    {id:'ev3', title:'Sprint 3 planning',       date:'2026-07-22', time:'10:00', hours:1,   kind:'commitment', who:'Shardul, Papa', repeat:'',      note:''},
    {id:'ev4', title:'Sprint 3 review + retro',  date:'2026-08-04', time:'19:00', hours:2,   kind:'commitment', who:'Shardul, Papa', repeat:'',      note:'Close the sprint, record velocity, plan Sprint 4.'},
  ],

  /* Free-form notes from the sprint review, newest first. */
  retros: [
    {id:'r1', sprintId:'s2', who:'Shardul', at:'2026-07-21T20:00:00',
     text:'Sprite sheet took two attempts. Estimating art work at the same rate as code is wrong — art needs a bigger buffer.'},
    {id:'r2', sprintId:'s2', who:'Papa', at:'2026-07-21T20:15:00',
     text:'Good progress on the game, but nothing moved on the resume for two sprints. That is the one thing with a real deadline. Put it in Sprint 3 and do it first.'},
  ],
};
