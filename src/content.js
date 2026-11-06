export const SITE = {
  title: 'A Day on Paper',
  tagline: "A small room for things that don't quite belong anywhere else.",
  description:
    'Step into a room cut from paper: projects live on the monitor, notes rest on the coffee table, and a book on the shelf tells you more about me.',
};

export const WORKS = [
  {
    title: 'Waifu Companion',
    meta: '2026 · iOS / 3D / AI Companion',
    desc: 'A little world where your favorite character comes to life, beyond the game.',
    tint: '#F2C9B8',
    body: `I wanted to spend time with my favorite game characters without having to open a game or follow its rules.

Waifu Companion is an interactive iOS prototype that brings a stylized 3D character into a small, ever-changing world. The sky shifts with the time of day, while real-time voice conversations make the experience feel more alive.

I built the character pipeline, animation system, rendering, AI agent, backend, and iOS client independently. Along the way, I explored how to balance visual detail, natural movement, and smooth performance on a phone.

**Character & Animation**
Rigged and refined a stylized 3D character, adjusted its physics, and built an animation state machine in Unity.

**Rendering & Performance**
Baked high-poly details onto lower-poly geometry and balanced rendering quality with mobile performance.

**World & Atmosphere**
Created a camera and scene setup with time-aware skyboxes and an immersive viewing mode.

**Voice & Infrastructure**
Built the real-time voice interaction pipeline, AI agent, backend services, iOS client, and Google Sign-In integration.

**Tools**
Blender, Unity, C#, Python, TypeScript, PostgreSQL, S3.`,
    link: 'https://github.com/CYXCAT/Columbina-backend-chatting',
  },
  {
    title: 'Embodied AI Evaluation',
    meta: '2026 · Robotics / Simulation / AI',
    desc: 'A testing ground for embodied AI, exploring how robots navigate, make decisions, and behave safely.',
    tint: '#C9DCEB',
    body: `How can we understand what a robot does before it enters the real world?

During my internship, I worked with a team on a simulation-based evaluation system for embodied AI agents. My work involved building evaluation workflows, exploring navigation and path planning, and supporting the analysis of agent behavior and safety.

The project brought together simulation, robotics, and software engineering. It gave me a closer look at how careful testing helps turn complex agent behavior into something we can observe, understand, and gradually improve.

**Simulation & Evaluation**
Contributed to workflows for evaluating embodied AI agents in simulated environments.

**Navigation & Planning**
Worked on navigation-related components and path-planning workflows.

**Behavior & Safety**
Supported the evaluation of agent behavior, with attention to safety and traceability.

**Role**
Engineering Intern · Team Project`,
    link: '',
  },
  {
    title: 'langgraph-rust',
    meta: '2026 · Open Source / Rust / AI Infrastructure',
    desc: 'A Rust take on LangGraph, born from a missing tool and a curiosity to build it myself.',
    tint: '#D6DDB8',
    body: `I was drawn to Rust for its performance and its growing role in the blockchain ecosystem. But when I looked for a LangGraph-like library in Rust, I couldn't find what I needed. So I decided to build one myself.

Around the same time, another developer started a similar project and kept improving it over time.

Looking back, this project taught me something beyond programming: starting an open-source project is exciting, but showing up for it, version after version, is what allows it to grow.

**A Missing Piece**
Explored bringing LangGraph-style agent workflows into the Rust ecosystem.

**Building in Rust**
Developed an independent Rust implementation, motivated by performance and the language's growing ecosystem.

**An Open-Source Lesson**
Learned that maintaining and improving a project over time matters just as much as building its first version.

**Role**
Independent Developer

**Status**
Published Crate`,
    link: 'https://crates.io/crates/langgraph-core',
  },
];

export const POSTS = [
  {
    title: 'A Little House for the Afterlife',
    date: 'Nov 5, 2026',
    body: `I've always been fascinated by Chinese paper offerings — little houses, furniture, and everyday objects made for the world beyond this one.

There's something strangely comforting about the idea. Even after death, someone might still need a place to sleep, a table by the window, and a blanket to curl up under.

I sometimes think that when I die, I'd like to live in one of those little paper houses myself.

So I wanted to make a room that feels like one. Not quite real, not quite imaginary. Just a tiny place made of paper, with enough space for all the ordinary things that make a home feel like home.

I wonder what it would be like to live there.

I think a paper blanket would be very warm.

Perhaps a home doesn't have to be real to feel warm.`,
  },
];

export const ABOUT = {
  kicker: 'A Note from the Resident',
  title: 'About Me',
  paragraphs: [
    "Hi, I'm CYXCAT. I'm not entirely sure where I'm going, but I keep making things along the way. Lately, I've been exploring how AI might find its place in more specialized fields, and what happens when it becomes part of the physical world. I made this paper room because I wanted a pretty corner of the internet to call my own.",
    "I like making and sharing MMD models, playing video games (currently Blue Archive), and sleeping. My music taste wanders from Vocaloid to hard rock, death metal, Jun Togawa, and Halle Uchida. I used to paint with watercolors and oils, and lately I've been curious about robotic arms and embroidery. Somewhere between all of that, I'm also trying to quit Crumbl Cookies.",
  ],
  links: [
    { label: 'Email', value: 'yingxiao649@gmail.com', href: 'mailto:yingxiao649@gmail.com' },
    { label: 'GitHub', value: '@CYXCAT', href: 'https://github.com/CYXCAT' },
    { label: 'LinkedIn', value: 'Yingxiao Cheng', href: 'https://www.linkedin.com/in/yingxiao-cheng-agent/' },
  ],
};
