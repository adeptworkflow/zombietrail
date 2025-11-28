// ZOMBIE TRAIL - Game Engine v6
// UPDATES: Character backstories, AI receives backstory context, continuity fixes
// Pure engine - all content loaded from JSON files

// ============================================================================
// GAME STATE
// ============================================================================

let gameState = {
    // Journey progress
    day: 1,
    locationIndex: 0,
    milestraveled: 0,
    targetMiles: 500,
    
    // Survivors
    survivor1: {
        name: "",
        role: "",
        backstory: "",
        health: 100,
        maxHealth: 100,
        injuries: []
    },
    survivor2: {
        name: "",
        role: "",
        backstory: "",
        health: 100,
        maxHealth: 100,
        injuries: []
    },
    relationship: "",
    relationshipBackstory: "",
    
    // Resources
    food: 12,      // Base amount
    medicine: 1,   // Base amount (roles add more)
    fuel: 10,      // Base amount
    ammo: 6,       // Base amount
    morale: 70,
    
    // Current state
    currentLocation: null,
    locationSecured: false,
    gameOver: false,

    // Flow control
    currentAction: null,      // 'travel' | 'scavenge' | 'rest' | 'secure' | 'ambush' | null
    pendingMercyKill: false,  // used to interrupt night flow when mercy kill triggers
    
    // Trauma/status effects
    trauma: null,
    soloSurvival: false,
    
    // Data loaded from JSON
    locations: [],
    encounters: {},
    travelEncounters: [],
    restEncounters: [],
    ambushEncounters: [],
    scavengeEncounters: [],   // category-based scavenge pool
    injuries: {},
    items: {}
};

// Character creation state
let charCreation = {
    survivor1Name: "",
    survivor1Role: "",
    survivor1Backstory: "",
    survivor2Name: "",
    survivor2Role: "",
    survivor2Backstory: "",
    relationship: "",
    relationshipBackstory: ""
};

// Role definitions with starter bonuses and backstories
const roles = {
    scout: { 
        name: "Scout", 
        description: "Perception & Stealth - Spots danger early",
        bonus: "+2 Fuel",
        backstories: [
            { id: "park_ranger", text: "Park Ranger", description: "Years in the wilderness, knows survival" },
            { id: "police_detective", text: "Police Detective", description: "Investigative instincts, reads situations" },
            { id: "hunter", text: "Hunter", description: "Tracking expert, patient and observant" }
        ]
    },
    medic: { 
        name: "Medic", 
        description: "Medicine & First Aid - Heals injuries",
        bonus: "+2 Medicine",
        backstories: [
            { id: "combat_medic", text: "Combat Medic", description: "Army field hospital, trauma experience" },
            { id: "er_nurse", text: "ER Nurse", description: "Big city trauma center, seen everything" },
            { id: "paramedic", text: "Paramedic", description: "First responder, calm under pressure" }
        ]
    },
    soldier: { 
        name: "Soldier", 
        description: "Combat & Tactics - Better in fights",
        bonus: "+3 Ammo",
        backstories: [
            { id: "us_marine", text: "US Marine", description: "Infantry veteran, multiple deployments" },
            { id: "national_guard", text: "National Guard", description: "Disaster response training" },
            { id: "special_forces", text: "Special Forces", description: "Elite training, tactical expert" }
        ]
    },
    engineer: { 
        name: "Engineer", 
        description: "Repair & Tech - Fixes vehicles",
        bonus: "+2 Fuel",
        backstories: [
            { id: "mechanic", text: "Mechanic", description: "Auto shop owner, can fix anything" },
            { id: "electrician", text: "Electrician", description: "Industrial systems, problem solver" },
            { id: "construction", text: "Construction Worker", description: "Hands-on builder, resourceful" }
        ]
    },
    cook: { 
        name: "Cook", 
        description: "Food Management - Boosts morale",
        bonus: "+4 Food",
        backstories: [
            { id: "restaurant_chef", text: "Restaurant Chef", description: "Professional kitchen, feeds crowds" },
            { id: "military_cook", text: "Military Cook", description: "Field rations expert, makes do with little" },
            { id: "homesteader", text: "Homesteader", description: "Self-sufficient, preserves and forages" }
        ]
    },
    negotiator: { 
        name: "Negotiator", 
        description: "Charisma & Trade - Better deals",
        bonus: "+2 Food, +1 Fuel",
        backstories: [
            { id: "salesperson", text: "Salesperson", description: "Reads people, builds rapport quickly" },
            { id: "social_worker", text: "Social Worker", description: "De-escalation expert, empathetic" },
            { id: "lawyer", text: "Lawyer", description: "Persuasive speaker, negotiates anything" }
        ]
    }
};

// Relationship types with backstory options
const relationships = {
    siblings: {
        text: "Siblings",
        description: "Protective, familiar bond",
        backstories: [
            { id: "grew_up_together", text: "Grew up together", description: "Close since childhood" },
            { id: "estranged", text: "Estranged siblings", description: "Complicated history, reconnecting now" },
            { id: "protective", text: "Protective dynamic", description: "One always looked after the other" }
        ]
    },
    spouses: {
        text: "Spouses",
        description: "Deep emotional connection",
        backstories: [
            { id: "newlyweds", text: "Newlyweds", description: "Recently married, still learning about each other" },
            { id: "long_married", text: "Married for years", description: "Been through everything together" },
            { id: "high_school_sweethearts", text: "High school sweethearts", description: "Known each other forever" }
        ]
    },
    parent_child: {
        text: "Parent & Child",
        description: "Generational, protective",
        backstories: [
            { id: "single_parent", text: "Single parent", description: "Raised them alone, fierce bond" },
            { id: "strict_parent", text: "Strict upbringing", description: "Learning to see each other differently now" },
            { id: "close_family", text: "Close family", description: "Always been best friends" }
        ]
    },
    friends: {
        text: "Close Friends",
        description: "Loyalty, shared history",
        backstories: [
            { id: "childhood_friends", text: "Childhood friends", description: "Known each other since kids" },
            { id: "college_roommates", text: "College roommates", description: "Met in school, stayed close" },
            { id: "work_buddies", text: "Work buddies", description: "Met on the job, became inseparable" }
        ]
    },
    strangers: {
        text: "Strangers",
        description: "Building trust",
        backstories: [
            { id: "met_fleeing", text: "Met while fleeing", description: "Thrown together by circumstance" },
            { id: "rescued", text: "One rescued the other", description: "Debt of gratitude" },
            { id: "chance_encounter", text: "Chance encounter", description: "Wrong place, right time" }
        ]
    }
};

// Map location.category → list of scavenge encounter "location" names
const SCAVENGE_CATEGORY_MAP = {
    pharmacy: [
        "Abandoned Pharmacy",
        "Strip Mall Pharmacy",
        "Drive-Through Pharmacy",
        "Looted Hospital Pharmacy Wing",
        "City Hospital Emergency Wing",
        "Rural Clinic"
    ],
    gas_station: [
        "Highway Gas Station",
        "Rural Gas Stop",
        "Highway Travel Plaza"
    ],
    grocery: [
        "Neighborhood Grocery Store",
        "Corner Market",
        "Big Box Supermarket"
    ],
    home: [
        "Abandoned Suburban House",
        "Cul-de-sac House",
        "Row of Townhouses",
        "Gated Subdivision Home"
    ],
    school: [
        "Abandoned Elementary School",
        "High School Campus"
    ],
    police_station: [
        "City Police Substation",
        "Small Town Police Station"
    ],
    military: [
        "Overrun Military Checkpoint",
        "Crashed Military Helicopter",
        "Abandoned National Guard Depot"
    ],
    farm: [
        "Rural Farmhouse",
        "Abandoned Dairy Farm",
        "Hillside Homestead"
    ],
    ranger_station: [
        "Forest Ranger Cabin",
        "Lakeside Ranger Station"
    ],
    motel: [
        "Highway Motel",
        "Roadside Motor Lodge"
    ]
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function rollDice(diceString) {
    const parts = diceString.toLowerCase().split('d');
    const numDice = parseInt(parts[0]);
    const numSides = parseInt(parts[1]);
    
    let total = 0;
    for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * numSides) + 1;
    }
    return total;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function checkSuccess(baseChance) {
    let adjustedChance = baseChance;
    
    // Morale modifier: ±5%
    if (gameState.morale >= 70) adjustedChance += 0.05;
    if (gameState.morale <= 30) adjustedChance -= 0.05;
    
    // Injury penalties (concussion, exhaustion reduce success)
    getLivingSurvivors().forEach(survivor => {
        survivor.injuries.forEach(injury => {
            if (injury.effects && injury.effects.decisionPenalty) {
                adjustedChance -= injury.effects.decisionPenalty;
            }
        });
    });
    
    return Math.random() < Math.max(0, Math.min(1, adjustedChance));
}

function hasRole(role) {
    const living = getLivingSurvivors();
    return living.some(s => s.role === role);
}

function getSurvivorWithRole(role) {
    const living = getLivingSurvivors();
    return living.find(s => s.role === role) || null;
}

function getLivingSurvivors() {
    const living = [];
    if (gameState.survivor1.health > 0) living.push(gameState.survivor1);
    if (gameState.survivor2.health > 0) living.push(gameState.survivor2);
    return living;
}

function isSoloMode() {
    return getLivingSurvivors().length === 1;
}

function formatText(text) {
    if (!text) return '';
    
    const living = getLivingSurvivors();
    
    // Solo mode: simplify text
    if (living.length === 1) {
        const survivor = living[0];
        text = text
            .replace(/\{SURVIVOR1\} and \{SURVIVOR2\}/g, survivor.name)
            .replace(/\{SURVIVOR2\} and \{SURVIVOR1\}/g, survivor.name)
            .replace(/the \{RELATIONSHIP\}/g, survivor.name)
            .replace(/\{RELATIONSHIP\}/g, 'survivor')
            .replace(/\{SURVIVOR1\}/g, survivor.name)
            .replace(/\{SURVIVOR2\}/g, survivor.name)
            .replace(/\{ROLE1\}/g, survivor.role.toLowerCase())
            .replace(/\{ROLE2\}/g, survivor.role.toLowerCase())
            .replace(/\{ROLE1_CAP\}/g, survivor.role)
            .replace(/\{ROLE2_CAP\}/g, survivor.role);
        return text;
    }
    
    // Two survivors: normal formatting
    const relKey = gameState.relationship;
    let relLabel = relKey && relationships[relKey]
        ? relationships[relKey].text
        : (relKey || '');
    
    return text
        .replaceAll('{SURVIVOR1}', gameState.survivor1.name || 'the first survivor')
        .replaceAll('{SURVIVOR2}', gameState.survivor2.name || 'the second survivor')
        .replaceAll('{ROLE1}', (gameState.survivor1.role || 'survivor').toLowerCase())
        .replaceAll('{ROLE2}', (gameState.survivor2.role || 'survivor').toLowerCase())
        .replaceAll('{ROLE1_CAP}', gameState.survivor1.role || 'Survivor')
        .replaceAll('{ROLE2_CAP}', gameState.survivor2.role || 'Survivor')
        .replaceAll('{RELATIONSHIP}', relLabel || 'companions');
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadGameData() {
    try {
        // LOCATIONS
        const locResponse = await fetch('data/locations.json');
        if (locResponse.ok) {
            gameState.locations = await locResponse.json();
            console.log(`Loaded ${gameState.locations.length} locations`);

            // Ensure scavenged flag is initialized
            gameState.locations.forEach(loc => {
                if (loc.scavenged === undefined) {
                    loc.scavenged = false;
                }
            });
        } else {
            console.error('Failed to load locations.json');
        }

        // Reset encounter containers
        gameState.encounters = {};
        gameState.travelEncounters = [];
        gameState.restEncounters = [];
        gameState.ambushEncounters = [];
        gameState.scavengeEncounters = [];

        // Helper to index encounters by id into gameState.encounters
        function indexEncounters(array) {
            if (!Array.isArray(array)) return;
            array.forEach(enc => {
                if (enc && enc.id) {
                    gameState.encounters[enc.id] = enc;
                }
            });
        }

        // SCAVENGE ENCOUNTERS
        try {
            const scavResponse = await fetch('data/encounters-scavenge.json');
            if (scavResponse.ok) {
                const scavArray = await scavResponse.json();
                gameState.scavengeEncounters = scavArray;
                console.log(`Loaded ${scavArray.length} scavenge encounters`);
            } else {
                console.warn('No encounters-scavenge.json found or failed to load.');
            }
        } catch (e) {
            console.error('Error loading encounters-scavenge.json', e);
        }

        // TRAVEL ENCOUNTERS
        try {
            const travelResponse = await fetch('data/encounters-travel.json');
            if (travelResponse.ok) {
                const travelArray = await travelResponse.json();
                gameState.travelEncounters = travelArray;
                indexEncounters(travelArray);
                console.log(`Loaded ${travelArray.length} travel encounters`);
            } else {
                console.warn('No encounters-travel.json found or failed to load.');
            }
        } catch (e) {
            console.error('Error loading encounters-travel.json', e);
        }

        // REST ENCOUNTERS
        try {
            const restResponse = await fetch('data/encounters-rest.json');
            if (restResponse.ok) {
                const restArray = await restResponse.json();
                gameState.restEncounters = restArray;
                indexEncounters(restArray);
                console.log(`Loaded ${restArray.length} rest encounters`);
            } else {
                console.warn('No encounters-rest.json found or failed to load.');
            }
        } catch (e) {
            console.error('Error loading encounters-rest.json', e);
        }

        // AMBUSH ENCOUNTERS
        try {
            const ambushResponse = await fetch('data/encounters-ambush.json');
            if (ambushResponse.ok) {
                const ambushArray = await ambushResponse.json();
                gameState.ambushEncounters = ambushArray;
                indexEncounters(ambushArray);
                console.log(`Loaded ${ambushArray.length} ambush encounters`);
            } else {
                console.warn('No encounters-ambush.json found or failed to load.');
            }
        } catch (e) {
            console.error('Error loading encounters-ambush.json', e);
        }

        // INJURIES
        const injuryResponse = await fetch('data/injuries.json');
        if (injuryResponse.ok) {
            const injuriesArray = await injuryResponse.json();
            gameState.injuries = {};
            injuriesArray.forEach(inj => {
                if (inj && inj.id) {
                    gameState.injuries[inj.id] = inj;
                }
            });
            console.log(`Loaded ${injuriesArray.length} injury types`);
        } else {
            console.error('Failed to load injuries.json');
        }

        // ITEMS / STARTER BONUSES (not used anymore, bonuses hardcoded)
        const itemsResponse = await fetch('data/items.json');
        if (itemsResponse.ok) {
            gameState.items = await itemsResponse.json();
            console.log('Loaded items configuration');
        } else {
            console.error('Failed to load items.json');
        }

    } catch (error) {
        console.error('Error loading game data:', error);
        alert('Failed to load game data. Please refresh the page.');
    }
}

// ============================================================================
// ITEM & RESOURCE MECHANICS
// ============================================================================

function applyStarterItems() {
    const starterBonuses = {
        scout: { fuel: 2 },
        medic: { medicine: 2 },
        soldier: { ammo: 3 },
        engineer: { fuel: 2 },
        cook: { food: 4 },
        negotiator: { food: 2, fuel: 1 }
    };
    
    const role1Key = charCreation.survivor1Role;
    const role2Key = charCreation.survivor2Role;
    
    const bonus1 = starterBonuses[role1Key];
    const bonus2 = starterBonuses[role2Key];
    
    if (bonus1) {
        Object.entries(bonus1).forEach(([resource, amount]) => {
            gameState[resource] = (gameState[resource] || 0) + amount;
        });
    }
    
    if (bonus2) {
        Object.entries(bonus2).forEach(([resource, amount]) => {
            gameState[resource] = (gameState[resource] || 0) + amount;
        });
    }
}

function processDaily() {
    // Food consumption: 1 per living survivor
    const living = getLivingSurvivors();
    gameState.food -= living.length;
    
    // Starvation
    if (gameState.food < 0) {
        gameState.food = 0;
        living.forEach(survivor => {
            survivor.health -= 5;
        });
        gameState.morale -= 10;
    }
    
    // Fuel consumption (abstracted travel overhead)
    if (gameState.fuel > 0) {
        gameState.fuel -= 1;
    }
    
    // Process injuries
    processInjuries();
    
    // Trauma decay
    if (gameState.trauma) {
        if (gameState.trauma.effects && gameState.trauma.effects.moraleDecay) {
            gameState.morale += gameState.trauma.effects.moraleDecay;
        }
    }
    
    // Check for zombie bite turning
    checkZombieBiteTurning();
}

function processInjuries() {
    // Only process injuries for LIVING survivors
    getLivingSurvivors().forEach(survivor => {
        if (!survivor.injuries || survivor.injuries.length === 0) return;
        
        survivor.injuries.forEach((injury, index) => {
            // Apply daily damage
            if (injury.effects && injury.effects.damagePerDay) {
                survivor.health -= injury.effects.damagePerDay;
            }
            
            // Apply morale effects
            if (injury.effects && injury.effects.moralePerDay) {
                gameState.morale += injury.effects.moralePerDay;
            }
            
            // Countdown to death
            if (injury.daysUntilDeath !== undefined && injury.daysUntilDeath !== null) {
                injury.daysUntilDeath -= 1;
                if (injury.daysUntilDeath <= 0 && injury.id !== 'zombie_bite') {
                    // Death from injury (not zombie bite - that triggers mercy kill)
                    survivor.health = 0;
                }
            }
            
            // Healing countdown
            if (injury.healDays !== undefined && injury.healDays !== null) {
                injury.healDays -= 1;
                if (injury.healDays <= 0) {
                    survivor.injuries.splice(index, 1);
                }
            }
            
            // Infection risk
            if (injury.effects && injury.effects.infectionRisk) {
                if (Math.random() < injury.effects.infectionRisk) {
                    const infectBite = { ...gameState.injuries.zombie_bite };
                    infectBite.daysUntilTurn = randomInt(1, 2);
                    survivor.injuries.push(infectBite);
                }
            }
        });
    });
    
    // Clamp morale
    gameState.morale = Math.max(0, Math.min(100, gameState.morale));
}

function checkZombieBiteTurning() {
    // Only check LIVING survivors for turning
    getLivingSurvivors().forEach(survivor => {
        const bite = survivor.injuries.find(inj => inj.id === 'zombie_bite');
        if (bite && bite.daysUntilTurn !== undefined) {
            bite.daysUntilTurn -= 1;
            if (bite.daysUntilTurn <= 0) {
                // Trigger mercy kill event
                gameState.pendingMercyKill = true;
                triggerMercyKillEvent(survivor);
            }
        }
    });
}

function useMedicine(survivorNum) {
    if (gameState.medicine <= 0) return;
    
    const survivor = survivorNum === 1 ? gameState.survivor1 : gameState.survivor2;
    
    // Don't allow healing dead survivors
    if (survivor.health <= 0) return;
    
    if (survivor.health >= survivor.maxHealth) return;
    
    // Heal 25 HP
    survivor.health = Math.min(survivor.health + 25, survivor.maxHealth);
    gameState.medicine -= 1;
    
    // Medic bonus: also cure one injury
    if (hasRole('Medic')) {
        if (survivor.injuries.length > 0) {
            // Cure first non-fatal injury
            const curable = survivor.injuries.findIndex(inj => 
                inj.cure === 'medicine' && inj.id !== 'zombie_bite'
            );
            if (curable !== -1) {
                survivor.injuries.splice(curable, 1);
            }
        }
    }
    
    updateStats();
}

// ============================================================================
// INJURY SYSTEM
// ============================================================================

function applyInjury(survivor, injuryId) {
    // Don't apply injuries to dead survivors
    if (survivor.health <= 0) return;
    
    const injuryTemplate = gameState.injuries[injuryId];
    if (!injuryTemplate) {
        console.warn(`Injury ${injuryId} not found`);
        return;
    }
    
    // Clone injury data
    const injury = JSON.parse(JSON.stringify(injuryTemplate));
    
    // Special handling for certain injuries
    if (injury.id === 'zombie_bite') {
        injury.daysUntilTurn = randomInt(1, 2);
    }
    
    survivor.injuries.push(injury);
}

function triggerMercyKillEvent(bittenSurvivor) {
    const survivorName = bittenSurvivor.name;
    
    // Get the OTHER survivor (if alive)
    const living = getLivingSurvivors();
    const otherSurvivor = living.find(s => s !== bittenSurvivor);
    
    if (!otherSurvivor) {
        // Only one survivor and they're turning - game over
        bittenSurvivor.health = 0;
        gameOver(false);
        return;
    }

    showNarration(`
        <strong>💀 THE INEVITABLE 💀</strong><br><br>
        ${survivorName}'s fever broke an hour ago. Now they're cold. Gray veins crawl up their neck. 
        Their breathing is shallow, irregular. They look at ${otherSurvivor.name} one last time with eyes that are almost... not theirs.<br><br>
        "Do it," they whisper. "Before I..."<br><br>
        They don't finish. You both know what comes next.
    `);

    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';

    const choices = [
        {
            text: `End it quickly (shoot ${survivorName})`,
            requires: 'ammo',
            morale: -30,
            trauma: 'mercy_kill'
        },
        {
            text: `Say goodbye first, then shoot`,
            requires: 'ammo',
            morale: -25,
            trauma: 'mercy_kill_closure'
        },
        {
            text: `Can't do it - let nature take its course`,
            requires: null,
            morale: -40,
            trauma: 'watched_turn'
        },
        {
            text: `Use a blade (no ammo required)`,
            requires: null,
            morale: -35,
            trauma: 'brutal_mercy'
        }
    ];

    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';

        if (choice.requires === 'ammo' && gameState.ammo < 1) {
            btn.disabled = true;
            btn.textContent = `${choice.text} [Need 1 ammo]`;
            btn.style.opacity = '0.5';
        } else {
            btn.textContent = choice.text;
            btn.onclick = () => handleMercyKill(bittenSurvivor, choice);
        }

        choicesDiv.appendChild(btn);
    });
}

function handleMercyKill(bittenSurvivor, choice) {
    // Kill the bitten survivor
    bittenSurvivor.health = 0;
    bittenSurvivor.injuries = [];

    // Ammo if required
    if (choice.requires === 'ammo' && gameState.ammo > 0) {
        gameState.ammo -= 1;
    }

    // Morale impact
    gameState.morale = Math.max(0, gameState.morale + choice.morale);

    // Set trauma event
    gameState.trauma = {
        type: choice.trauma,
        target: bittenSurvivor.name,
        relationship: gameState.relationship,
        effects: {
            moraleDecay: -2,
            nightmares: true,
            guilt: true
        }
    };

    const living = getLivingSurvivors();

    if (living.length === 0) {
        gameOver(false);
        return;
    }

    // Solo mode
    gameState.soloSurvival = true;

    showNarration(`
        <strong>Day ${gameState.day}</strong><br><br>
        The silence after is the loudest sound ${living[0].name} has ever heard.<br><br>
        They're alone now.
    `);

    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = 'Continue Alone →';
    btn.onclick = () => {
        // Mercy kill counts as the transition into the next day
        gameState.day += 1;
        gameState.pendingMercyKill = false;
        updateStats();
        showDailyBriefing();
    };

    choicesDiv.appendChild(btn);

    updateStats();
}

// ============================================================================
// LOCATION & TRAVEL SYSTEM
// ============================================================================

function getCurrentLocation() {
    if (!gameState.locations || gameState.locations.length === 0) return null;
    return gameState.locations[gameState.locationIndex] || null;
}

function advanceLocation() {
    gameState.locationIndex += 1;
    gameState.locationSecured = false;
   
    const loc = getCurrentLocation();
    if (loc && loc.scavenged === undefined) {
        loc.scavenged = false;
    }

    // Calculate miles traveled
    if (gameState.fuel > 0) {
        gameState.milestraveled += randomInt(20, 40);
    } else {
        // On foot - slower
        gameState.milestraveled += randomInt(10, 20);
        gameState.morale -= 5;
    }
}

function finishTravel() {
    const location = getCurrentLocation();
    if (!location) {
        showNarration(`
            <strong>On the Road</strong><br><br>
            You keep moving west into the dark. There's no clear landmark to camp by, just empty road and fear.<br><br>
            <em>Night falls.</em>
        `);

        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = 'Rest Overnight →';
        btn.onclick = () => restOvernight();
        choicesDiv.appendChild(btn);
        gameState.currentAction = null;
        return;
    }

    showNarration(`
        <strong>You continue traveling west…</strong><br><br>
        After hours on the road, you finally reach <strong>${location.name}</strong>.<br><br>
        ${formatText(location.description)}<br><br>
        <em>Night is falling. You set up camp nearby.</em>
    `);

    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = 'Rest Overnight →';
    btn.onclick = () => {
        gameState.currentAction = null;
        restOvernight();
    };

    choicesDiv.appendChild(btn);
}

function checkForAmbush() {
    let ambushChance = 0.10;
    
    if (gameState.fuel <= 0) ambushChance += 0.20;
    if (gameState.morale < 40) ambushChance += 0.10;
    if (gameState.locationSecured) ambushChance -= 0.05;
    
    return Math.random() < ambushChance;
}

function triggerAmbush() {
    if (!gameState.ambushEncounters || gameState.ambushEncounters.length === 0) {
        return false;
    }
    
    const ambush = gameState.ambushEncounters[
        Math.floor(Math.random() * gameState.ambushEncounters.length)
    ];

    gameState.currentAction = 'ambush';
    
    showNarration(`
        <strong>⚠️ AMBUSH! ⚠️</strong><br><br>
        <strong>Day ${gameState.day} - ${ambush.title}</strong><br><br>
        ${formatText(ambush.description)}
    `);
    
    showEncounterChoices(ambush);
    return true;
}

// ============================================================================
// NIGHT / DAY TRANSITION
// ============================================================================

function restOvernight() {
    processDaily();
    updateStats();

    if (gameState.pendingMercyKill) {
        return;
    }

    gameState.day += 1;
    updateStats();
    showDailyBriefing();
}

// ============================================================================
// DAILY ACTION SYSTEM
// ============================================================================

function showDailyBriefing() {
    if (gameState.gameOver) return;
    
    if (gameState.milestraveled >= gameState.targetMiles) {
        gameOver(true);
        return;
    }
    
    const living = getLivingSurvivors();
    if (living.length === 0) {
        gameOver(false);
        return;
    }
    
    if (checkForAmbush()) {
        if (triggerAmbush()) return;
    }
    
    const location = getCurrentLocation();
    if (!location) {
        showNarration('<strong>Error:</strong> No location data available.');
        return;
    }
    
    gameState.currentLocation = location;
    gameState.currentAction = null;
    
    const milesToGo = gameState.targetMiles - gameState.milestraveled;
    const daysToGo = Math.ceil(milesToGo / 30);
    
    let briefing = `<strong>Day ${gameState.day} - Morning at ${location.name}</strong><br><br>`;
    briefing += `${formatText(location.description)}<br><br>`;
    briefing += `<em>California Safe Zone: ${milesToGo} miles away (roughly ${daysToGo} days of travel)</em><br><br>`;
    
    if (gameState.food <= 2) briefing += `⚠️ <strong>Food critically low!</strong><br>`;
    if (gameState.fuel <= 0) briefing += `⚠️ <strong>Out of fuel - traveling on foot</strong><br>`;
    if (gameState.morale < 40) briefing += `⚠️ <strong>Morale is dangerously low</strong><br>`;
    
    living.forEach(survivor => {
        if (survivor.health < 30) {
            briefing += `⚠️ <strong>${survivor.name} is badly injured!</strong><br>`;
        }
        if (survivor.injuries.length > 0) {
            survivor.injuries.forEach(inj => {
                if (inj.daysUntilDeath) {
                    briefing += `💀 <strong>${survivor.name}: ${inj.name} - ${inj.daysUntilDeath} days left!</strong><br>`;
                }
            });
        }
    });
    
    showNarration(briefing);
    showDailyActions();
}

function showDailyActions() {
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    
    const actions = [
        {
            text: '🚗 Travel - Move to next location',
            action: 'travel'
        },
        {
            text: '🔍 Scavenge - Search this location',
            action: 'scavenge'
        },
        {
            text: '😴 Rest - Stay here and recover',
            action: 'rest'
        }
    ];
    
    if (!gameState.locationSecured && gameState.currentLocation.canSecure) {
        actions.push({
            text: '🔒 Secure Location - Fortify this area',
            action: 'secure'
        });
    }
    
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = action.text;
        btn.onclick = () => handleDailyAction(action.action);
        choicesDiv.appendChild(btn);
    });
}

function handleDailyAction(action) {
    switch(action) {
        case 'travel':
            handleTravel();
            break;
        case 'scavenge':
            handleScavenge();
            break;
        case 'rest':
            handleRest();
            break;
        case 'secure':
            handleSecure();
            break;
    }
}

function handleTravel() {
    gameState.currentAction = 'travel';
    advanceLocation();
    
    const location = getCurrentLocation();
    if (!location) {
        showNarration(`
            <strong>On the Road</strong><br><br>
            You spend the day traveling into the unknown.<br><br>
            <em>Night falls.</em>
        `);
        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = 'Rest Overnight →';
        btn.onclick = () => restOvernight();
        choicesDiv.appendChild(btn);
        return;
    }
    
    let travelEnc = null;
    
    if (location.travelEncounterId && gameState.encounters[location.travelEncounterId]) {
        travelEnc = gameState.encounters[location.travelEncounterId];
    } else if (gameState.travelEncounters.length > 0) {
        travelEnc = gameState.travelEncounters[
            Math.floor(Math.random() * gameState.travelEncounters.length)
        ];
    }
    
    if (travelEnc) {
        showNarration(`
            <strong>Day ${gameState.day} - On the Road</strong><br><br>
            ${formatText(travelEnc.description)}
        `);
        showEncounterChoices(travelEnc);
    } else {
        showNarration(`
            <strong>Day ${gameState.day} - On the Road</strong><br><br>
            You spend the day driving and pushing west. The miles crawl by, but you make progress.<br><br>
            By nightfall, you find a place to stop near <strong>${location.name}</strong>.<br><br>
            ${formatText(location.description)}<br><br>
            <em>Night is falling. You set up camp nearby.</em>
        `);
        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = 'Rest Overnight →';
        btn.onclick = () => restOvernight();
        choicesDiv.appendChild(btn);
    }
}

function handleScavenge() {
    const location = gameState.currentLocation;
    if (!location) return;

    if (location.scavenged) {
        showNarration(`
            <strong>${location.name}</strong><br><br>
            You've already scavenged here. There's nothing left to take.
        `);

        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = 'Back →';
        btn.onclick = () => showDailyBriefing();
        choicesDiv.appendChild(btn);
        return;
    }

    const category = location.category;
    if (!category) {
        showNarration(`<strong>Error:</strong> Location missing category.`);
        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = 'Back →';
        btn.onclick = () => showDailyBriefing();
        choicesDiv.appendChild(btn);
        return;
    }

    const pool = gameState.scavengeEncounters.filter(enc => {
        const locName = enc.location;
        return SCAVENGE_CATEGORY_MAP[category]?.includes(locName);
    });

    if (pool.length === 0) {
        showNarration(`
            <strong>${location.name}</strong><br><br>
            You search for a while, but find nothing worth taking.
        `);

        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = 'Back →';
        btn.onclick = () => showDailyBriefing();
        choicesDiv.appendChild(btn);
        return;
    }

    const encounter = pool[Math.floor(Math.random() * pool.length)];

    location.scavenged = true;
    gameState.currentAction = 'scavenge';

    showNarration(`
        <strong>Scavenging: ${location.name}</strong><br><br>
        ${formatText(encounter.description)}
    `);

    showEncounterChoices(encounter);
}

function handleRest() {
    const location = gameState.currentLocation;
    if (!location) return;

    gameState.currentAction = 'rest';

    let restEnc = null;
    
    if (location && location.restEncounterId && gameState.encounters[location.restEncounterId]) {
        restEnc = gameState.encounters[location.restEncounterId];
    } else if (gameState.restEncounters.length > 0) {
        restEnc = gameState.restEncounters[
            Math.floor(Math.random() * gameState.restEncounters.length)
        ];
    }
    
    if (restEnc) {
        showNarration(`
            <strong>Day ${gameState.day} - Resting at ${location.name}</strong><br><br>
            ${formatText(restEnc.description)}
        `);
        showEncounterChoices(restEnc);
    } else {
        gameState.morale += 5;
        showNarration(`
            <strong>Day ${gameState.day} - Rest Day</strong><br><br>
            The group rests at ${location.name}. It's quiet. A rare moment of peace.<br><br>
            <em>Morale improved slightly.</em>
        `);
        
        updateStats();
        
        const choicesDiv = document.getElementById('choices');
        choicesDiv.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = 'Rest Overnight →';
        btn.onclick = () => restOvernight();
        choicesDiv.appendChild(btn);
    }
}

function handleSecure() {
    const location = gameState.currentLocation;
    if (!location) return;

    gameState.currentAction = 'secure';

    gameState.locationSecured = true;
    gameState.morale += 10;
    
    showNarration(`
        <strong>Day ${gameState.day} - ${location.name}</strong><br><br>
        You spend the day securing the location. Barricading entrances, checking for weak points, setting up watch positions.<br><br>
        It's not perfect, but it's safer. For now.<br><br>
        <em>Location secured. Ambush risk reduced. Morale improved.</em>
    `);
    
    updateStats();
    
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = 'Rest Overnight →';
    btn.onclick = () => restOvernight();
    choicesDiv.appendChild(btn);
}

// ============================================================================
// ENCOUNTER HANDLING
// ============================================================================

function showEncounterChoices(encounter) {
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    
    encounter.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        
        const available = isChoiceAvailable(choice);
        
        if (!available.isAvailable) {
            btn.disabled = true;
            btn.textContent = `${formatText(choice.text)} [${available.reason}]`;
            btn.style.opacity = '0.5';
        } else {
            btn.textContent = formatText(choice.text);
            btn.onclick = () => handleEncounterChoice(encounter, index);
        }
        
        choicesDiv.appendChild(btn);
    });
}

function isChoiceAvailable(choice) {
    if (!choice.requirements) return { isAvailable: true };
    
    const req = choice.requirements;
    
    if (req.hasRole && !hasRole(req.hasRole)) {
        return { isAvailable: false, reason: `Needs ${req.hasRole}` };
    }
    
    if (req.food && gameState.food < req.food) {
        return { isAvailable: false, reason: `Need ${req.food} food` };
    }
    if (req.medicine && gameState.medicine < req.medicine) {
        return { isAvailable: false, reason: `Need ${req.medicine} medicine` };
    }
    if (req.fuel && gameState.fuel < req.fuel) {
        return { isAvailable: false, reason: `Need ${req.fuel} fuel` };
    }
    if (req.ammo && gameState.ammo < req.ammo) {
        return { isAvailable: false, reason: `Need ${req.ammo} ammo` };
    }
    
    return { isAvailable: true };
}

async function handleEncounterChoice(encounter, choiceIndex) {
    const choice = encounter.choices[choiceIndex];
    
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '<div class="loading">⏳ Processing...</div>';
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const isSuccess = checkSuccess(choice.successChance || 1.0);
    const outcome = isSuccess ? (choice.success || {}) : (choice.failure || {});
    
    applyEncounterOutcome(outcome);
    
    const narration = await generateAINarration(encounter, choice, isSuccess, outcome);
    showNarration(narration);
    
    updateStats();
    
    const living = getLivingSurvivors();
    if (living.length === 0) {
        gameOver(false);
        return;
    }
    
    if (gameState.milestraveled >= gameState.targetMiles) {
        gameOver(true);
        return;
    }
    
    choicesDiv.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'choice-btn';

    if (gameState.currentAction === 'ambush') {
        btn.textContent = 'Continue →';
        btn.onclick = () => {
            gameState.currentAction = null;
            showDailyBriefing();
        };
    } else if (gameState.currentAction === 'travel') {
        btn.textContent = 'Continue Traveling →';
        btn.onclick = () => {
            finishTravel();
        };
    } else {
        btn.textContent = 'Rest Overnight →';
        btn.onclick = () => {
            gameState.currentAction = null;
            restOvernight();
        };
    }

    choicesDiv.appendChild(btn);
}

function applyEncounterOutcome(outcome) {
    if (!outcome) return;
    
    if (outcome.injury) {
        const living = getLivingSurvivors();
        if (living.length > 0) {
            const target = living[Math.floor(Math.random() * living.length)];
            applyInjury(target, outcome.injury);
        }
    }
    
    if (outcome.damage) {
        const damage = rollDice(outcome.damage);
        const living = getLivingSurvivors();
        if (living.length > 0) {
            const target = living[Math.floor(Math.random() * living.length)];
            target.health -= damage;
        }
    }
    
    if (outcome.food) gameState.food = Math.max(0, gameState.food + outcome.food);
    if (outcome.medicine) gameState.medicine = Math.max(0, gameState.medicine + outcome.medicine);
    if (outcome.fuel) gameState.fuel = Math.max(0, gameState.fuel + outcome.fuel);
    if (outcome.ammo) gameState.ammo = Math.max(0, gameState.ammo + outcome.ammo);
    if (outcome.morale) {
        gameState.morale = Math.max(0, Math.min(100, gameState.morale + outcome.morale));
    }
}

// ============================================================================
// AI NARRATION - WITH BACKSTORY CONTEXT
// ============================================================================

async function generateAINarration(encounter, choice, isSuccess, outcome) {
    const living = getLivingSurvivors();
    
    // Helper to get backstory description
    function getBackstoryText(survivor) {
        if (!survivor.backstory) return null;
        const role = roles[Object.keys(roles).find(k => roles[k].name === survivor.role)];
        if (!role) return null;
        const backstory = role.backstories.find(b => b.id === survivor.backstory);
        return backstory ? `${backstory.text} - ${backstory.description}` : null;
    }
    
    // Helper to format injuries for a survivor
    function formatInjuries(survivor) {
        if (!survivor.injuries || survivor.injuries.length === 0) return null;
        return survivor.injuries.map(inj => {
            let text = inj.name;
            if (inj.daysUntilDeath) text += ` (${inj.daysUntilDeath} days left)`;
            if (inj.daysUntilTurn) text += ` (turning in ${inj.daysUntilTurn} days)`;
            return text;
        }).join(', ');
    }
    
    // Build comprehensive context
    const context = {
        // Encounter info
        encounter: encounter.location || encounter.title || 'Unknown location',
        choice: formatText(choice.text),
        result: isSuccess ? 'success' : 'failure',
        
        // Survivor 1 (always exists)
        survivor1name: gameState.survivor1.name,
        survivor1role: gameState.survivor1.role,
        survivor1backstory: getBackstoryText(gameState.survivor1),
        survivor1injuries: formatInjuries(gameState.survivor1),
        survivor1dead: gameState.survivor1.health <= 0,
        
        // Survivor 2 (may be dead)
        survivor2name: gameState.survivor2.health > 0 ? gameState.survivor2.name : 'alone',
        survivor2role: gameState.survivor2.health > 0 ? gameState.survivor2.role : 'none',
        survivor2backstory: gameState.survivor2.health > 0 ? getBackstoryText(gameState.survivor2) : null,
        survivor2injuries: gameState.survivor2.health > 0 ? formatInjuries(gameState.survivor2) : null,
        survivor2dead: gameState.survivor2.health <= 0,
        
        // Relationship & mode
        relationship: isSoloMode() ? 'solo survivor' : (relationships[gameState.relationship]?.text || gameState.relationship),
        relationshipBackstory: gameState.relationshipBackstory ? 
            relationships[gameState.relationship]?.backstories.find(b => b.id === gameState.relationshipBackstory)?.description : null,
        soloMode: isSoloMode(),
        
        // Resources
        food: gameState.food,
        medicine: gameState.medicine,
        fuel: gameState.fuel,
        ammo: gameState.ammo,
        morale: gameState.morale,
        
        // Additional context
        actionType: gameState.currentAction,
        day: gameState.day,
        
        // Build additional context string
        additionalContext: [
            outcome.damage ? `Damage dealt: ${outcome.damage}` : null,
            outcome.injury ? `Injury inflicted: ${outcome.injury}` : null,
            outcome.food ? `Food ${outcome.food > 0 ? 'gained' : 'lost'}: ${Math.abs(outcome.food)}` : null,
            outcome.medicine ? `Medicine ${outcome.medicine > 0 ? 'gained' : 'lost'}: ${Math.abs(outcome.medicine)}` : null,
            outcome.fuel ? `Fuel ${outcome.fuel > 0 ? 'gained' : 'lost'}: ${Math.abs(outcome.fuel)}` : null,
            outcome.ammo ? `Ammo ${outcome.ammo > 0 ? 'gained' : 'lost'}: ${Math.abs(outcome.ammo)}` : null,
            outcome.morale ? `Morale ${outcome.morale > 0 ? 'improved' : 'worsened'}: ${Math.abs(outcome.morale)}` : null
        ].filter(Boolean).join(', ')
    };
    
    try {
        const response = await fetch('https://anaxfstpqhsdtbivkjjq.supabase.co/functions/v1/narrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYXhmc3RwcWhzZHRiaXZrampxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODIwMjQsImV4cCI6MjA3OTc1ODAyNH0.qJMdqkbdMIQq5k4tjLG6KXNzcdby8xQf0C4WyLSz4tU'
            },
            body: JSON.stringify({ context })
        });
        
        const data = await response.json();
        
        if (data.narration) {
            return `<strong>Day ${gameState.day}</strong><br><br>${data.narration}<br><br><em>Miles traveled: ${gameState.milestraveled}/${gameState.targetMiles}</em>`;
        }
    } catch (error) {
        console.error('AI narration failed:', error);
    }
    
    // Fallback - check for pre-written narrations
    if (isSuccess && outcome.successNarration) {
        return `<strong>Day ${gameState.day}</strong><br><br>${formatText(outcome.successNarration)}<br><br><em>Miles traveled: ${gameState.milestraveled}/${gameState.targetMiles}</em>`;
    }
    
    if (!isSuccess && outcome.failureNarration) {
        return `<strong>Day ${gameState.day}</strong><br><br>${formatText(outcome.failureNarration)}<br><br><em>Miles traveled: ${gameState.milestraveled}/${gameState.targetMiles}</em>`;
    }
    
    // Final fallback
    return `<strong>Day ${gameState.day}</strong><br><br>${formatText(choice.text)} - ${isSuccess ? 'Success!' : 'Failed.'}<br><br><em>Miles traveled: ${gameState.milestraveled}/${gameState.targetMiles}</em>`;
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function updateStats() {
    document.getElementById('day').textContent = gameState.day;
    document.getElementById('food').textContent = gameState.food;
    document.getElementById('medicine').textContent = gameState.medicine;
    document.getElementById('fuel').textContent = gameState.fuel;
    document.getElementById('morale').textContent = gameState.morale;
    
    updateSurvivorCards();
}

function updateSurvivorCards() {
    const survivorsDisplay = document.getElementById('survivors-display');
    
    let html = '';
    
    [gameState.survivor1, gameState.survivor2].forEach((survivor, idx) => {
        const alive = survivor.health > 0;
        const num = idx + 1;
        
        html += `
            <div class="survivor-card" style="${!alive ? 'opacity: 0.4; border-color: #ff0000;' : ''}">
                <div class="survivor-name">${survivor.name}</div>
                <div class="survivor-role">${survivor.role}</div>
                <div class="survivor-health">Health: ${Math.max(0, survivor.health)}/${survivor.maxHealth}</div>
        `;
        
        if (alive && survivor.injuries && survivor.injuries.length > 0) {
            survivor.injuries.forEach(inj => {
                html += `<div style="color: #ff4444; font-size: 0.8em; margin-top: 5px;">⚠️ ${inj.name}`;
                if (inj.daysUntilDeath) {
                    html += ` (${inj.daysUntilDeath} days)`;
                } else if (inj.daysUntilTurn) {
                    html += ` (turns in ${inj.daysUntilTurn} days)`;
                }
                html += `</div>`;
            });
        }
        
        if (alive && gameState.medicine > 0 && survivor.health < survivor.maxHealth) {
            html += `<button onclick="useMedicine(${num})" style="margin-top: 10px; padding: 5px 10px; font-size: 0.9em;">Use Medicine</button>`;
        }
        
        if (!alive) {
            html += '<div style="color: #ff0000; margin-top: 5px;">💀 DECEASED</div>';
        }
        
        html += '</div>';
    });
    
    survivorsDisplay.innerHTML = html;
}

function showNarration(text) {
    const narrationDiv = document.getElementById('narration');
    narrationDiv.innerHTML = `<p>${text}</p>`;
}

function gameOver(won) {
    gameState.gameOver = true;
    
    const living = getLivingSurvivors();
    
    if (won) {
        const survivorText = living.length === 2 
            ? `${gameState.survivor1.name} and ${gameState.survivor2.name} made it together.`
            : `${living[0].name} made it alone.`;
        
        showNarration(`
            <strong>🎉 YOU SURVIVED! 🎉</strong><br><br>
            After ${gameState.day} days of hell, ${living.length === 2 ? 'both survivors' : 'one survivor'} reached the California Safe Zone.<br>
            ${survivorText}<br><br>
            Miles traveled: ${gameState.milestraveled}<br>
            Days survived: ${gameState.day}<br><br>
            <em>MVP Demo Complete. Full game coming soon!</em>
        `);
    } else {
        showNarration(`
            <strong>💀 GAME OVER 💀</strong><br><br>
            The last survivor fell on Day ${gameState.day}.<br>
            You traveled ${gameState.milestraveled} miles before the end.<br><br>
            <em>Want to try again?</em>
        `);
    }
    
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    const playAgainBtn = document.createElement('button');
    playAgainBtn.className = 'choice-btn';
    playAgainBtn.textContent = 'Play Again';
    playAgainBtn.onclick = () => location.reload();
    choicesDiv.appendChild(playAgainBtn);
}

// ============================================================================
// CHARACTER CREATION
// ============================================================================

function showCharacterCreation() {
    showNarration(`
        <strong>Create Your Survivors</strong><br><br>
        Two people, one journey. Who are they?
    `);
    
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = `
        <div class="char-creation">
            <div class="char-section">
                <h3>Survivor 1</h3>
                <div class="input-group">
                    <label>Name:</label>
                    <input type="text" id="survivor1-name" placeholder="Enter name..." maxlength="20">
                </div>
                <label>Role:</label>
                <div class="role-select" id="survivor1-roles">
                    ${Object.keys(roles).map(roleKey => `
                        <div class="role-option" onclick="selectRole(1, '${roleKey}')">
                            <div class="role-name">${roles[roleKey].name}</div>
                            <div class="role-desc">${roles[roleKey].description}</div>
                            <div class="role-bonus">Starting: ${roles[roleKey].bonus}</div>
                        </div>
                    `).join('')}
                </div>
                <div id="survivor1-backstory-select" style="display: none; margin-top: 15px;">
                    <label>Background:</label>
                    <div id="survivor1-backstories"></div>
                </div>
            </div>

            <div class="char-section">
                <h3>Survivor 2</h3>
                <div class="input-group">
                    <label>Name:</label>
                    <input type="text" id="survivor2-name" placeholder="Enter name..." maxlength="20">
                </div>
                <label>Role:</label>
                <div class="role-select" id="survivor2-roles">
                    ${Object.keys(roles).map(roleKey => `
                        <div class="role-option" onclick="selectRole(2, '${roleKey}')">
                            <div class="role-name">${roles[roleKey].name}</div>
                            <div class="role-desc">${roles[roleKey].description}</div>
                            <div class="role-bonus">Starting: ${roles[roleKey].bonus}</div>
                        </div>
                    `).join('')}
                </div>
                <div id="survivor2-backstory-select" style="display: none; margin-top: 15px;">
                    <label>Background:</label>
                    <div id="survivor2-backstories"></div>
                </div>
            </div>

            <div class="char-section">
                <h3>Relationship</h3>
                <div class="relationship-select" id="relationship-select">
                    ${Object.keys(relationships).map(relKey => `
                        <div class="relationship-option" onclick="selectRelationship('${relKey}')">
                            <div class="rel-name">${relationships[relKey].text}</div>
                            <div class="rel-desc">${relationships[relKey].description}</div>
                        </div>
                    `).join('')}
                </div>
                <div id="relationship-backstory-select" style="display: none; margin-top: 15px;">
                    <label>Your Story:</label>
                    <div id="relationship-backstories"></div>
                </div>
            </div>

            <button class="start-journey-btn" id="start-journey-btn" onclick="startJourney()" disabled>
                START JOURNEY
            </button>
        </div>
    `;
    
    document.getElementById('survivor1-name').addEventListener('input', validateCharCreation);
    document.getElementById('survivor2-name').addEventListener('input', validateCharCreation);
}

function selectRole(survivorNum, roleKey) {
    const role = roles[roleKey];
    
    if (survivorNum === 1) {
        charCreation.survivor1Role = roleKey;
        charCreation.survivor1Backstory = "";
        
        document.querySelectorAll('#survivor1-roles .role-option').forEach(el => el.classList.remove('selected'));
        event.target.closest('.role-option').classList.add('selected');
        
        const backstoryDiv = document.getElementById('survivor1-backstory-select');
        const backstoriesContainer = document.getElementById('survivor1-backstories');
        
        backstoriesContainer.innerHTML = role.backstories.map(bs => `
            <div class="backstory-option" onclick="selectBackstory(1, '${bs.id}')">
                <div class="backstory-name">${bs.text}</div>
                <div class="backstory-desc">${bs.description}</div>
            </div>
        `).join('');
        
        backstoryDiv.style.display = 'block';
        
    } else {
        charCreation.survivor2Role = roleKey;
        charCreation.survivor2Backstory = "";
        
        document.querySelectorAll('#survivor2-roles .role-option').forEach(el => el.classList.remove('selected'));
        event.target.closest('.role-option').classList.add('selected');
        
        const backstoryDiv = document.getElementById('survivor2-backstory-select');
        const backstoriesContainer = document.getElementById('survivor2-backstories');
        
        backstoriesContainer.innerHTML = role.backstories.map(bs => `
            <div class="backstory-option" onclick="selectBackstory(2, '${bs.id}')">
                <div class="backstory-name">${bs.text}</div>
                <div class="backstory-desc">${bs.description}</div>
            </div>
        `).join('');
        
        backstoryDiv.style.display = 'block';
    }
    
    validateCharCreation();
}

function selectBackstory(survivorNum, backstoryId) {
    if (survivorNum === 1) {
        charCreation.survivor1Backstory = backstoryId;
        document.querySelectorAll('#survivor1-backstories .backstory-option').forEach(el => el.classList.remove('selected'));
        event.target.closest('.backstory-option').classList.add('selected');
    } else {
        charCreation.survivor2Backstory = backstoryId;
        document.querySelectorAll('#survivor2-backstories .backstory-option').forEach(el => el.classList.remove('selected'));
        event.target.closest('.backstory-option').classList.add('selected');
    }
    
    validateCharCreation();
}

function selectRelationship(relKey) {
    const rel = relationships[relKey];
    
    charCreation.relationship = relKey;
    charCreation.relationshipBackstory = "";
    
    document.querySelectorAll('.relationship-option').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
    
    const backstoryDiv = document.getElementById('relationship-backstory-select');
    const backstoriesContainer = document.getElementById('relationship-backstories');
    
    backstoriesContainer.innerHTML = rel.backstories.map(bs => `
        <div class="backstory-option" onclick="selectRelationshipBackstory('${bs.id}')">
            <div class="backstory-name">${bs.text}</div>
            <div class="backstory-desc">${bs.description}</div>
        </div>
    `).join('');
    
    backstoryDiv.style.display = 'block';
    
    validateCharCreation();
}

function selectRelationshipBackstory(backstoryId) {
    charCreation.relationshipBackstory = backstoryId;
    document.querySelectorAll('#relationship-backstories .backstory-option').forEach(el => el.classList.remove('selected'));
    event.target.closest('.backstory-option').classList.add('selected');
    
    validateCharCreation();
}

function validateCharCreation() {
    const name1 = document.getElementById('survivor1-name')?.value.trim() || '';
    const name2 = document.getElementById('survivor2-name')?.value.trim() || '';
    
    charCreation.survivor1Name = name1;
    charCreation.survivor2Name = name2;
    
    const isValid = name1.length > 0 && 
                    name2.length > 0 && 
                    charCreation.survivor1Role && 
                    charCreation.survivor1Backstory &&
                    charCreation.survivor2Role && 
                    charCreation.survivor2Backstory &&
                    charCreation.relationship &&
                    charCreation.relationshipBackstory;
    
    const startBtn = document.getElementById('start-journey-btn');
    if (startBtn) {
        startBtn.disabled = !isValid;
    }
}

async function startJourney() {
    gameState.survivor1.name = charCreation.survivor1Name;
    gameState.survivor1.role = roles[charCreation.survivor1Role].name;
    gameState.survivor1.backstory = charCreation.survivor1Backstory;
    
    gameState.survivor2.name = charCreation.survivor2Name;
    gameState.survivor2.role = roles[charCreation.survivor2Role].name;
    gameState.survivor2.backstory = charCreation.survivor2Backstory;
    
    gameState.relationship = charCreation.relationship;
    gameState.relationshipBackstory = charCreation.relationshipBackstory;

    // Load game data and apply bonuses
    await loadGameData();
    applyStarterItems();

    // Show the "Night Before" scene first
    showNightBeforeScene();
}

function showNightBeforeScene() {
    const role1 = roles[charCreation.survivor1Role];
    const role2 = roles[charCreation.survivor2Role];
    const rel = relationships[charCreation.relationship];
    
    const backstory1 = role1.backstories.find(bs => bs.id === charCreation.survivor1Backstory);
    const backstory2 = role2.backstories.find(bs => bs.id === charCreation.survivor2Backstory);
    const relBackstory = rel.backstories.find(bs => bs.id === charCreation.relationshipBackstory);
    
    showNarration(`
        <strong>Night Before Day 1</strong><br><br>
        The barricades finally gave way just after midnight. By the time the shouting turned to screams, 
        ${gameState.survivor1.name} and ${gameState.survivor2.name} knew they had minutes before the whole settlement fell.<br><br>
        They grabbed whatever they could carry and reached the car, engine struggling as they pushed it out onto the dark road. 
        The last emergency broadcast they'd heard — before the radio cut to static — mentioned an evacuation checkpoint somewhere west, 
        though no one seemed certain exactly where.<br><br>
        With the settlement burning behind them, that rough direction was all they had. Getting clear of the chaos was the real priority. 
        The details could wait until morning.<br><br>
        <hr style="border-color: #00ff00; margin: 20px 0;"><br>
        <strong>${gameState.survivor1.name}</strong> - ${role1.name} (${backstory1.text})<br>
        <em>${backstory1.description}</em><br><br>
        <strong>${gameState.survivor2.name}</strong> - ${role2.name} (${backstory2.text})<br>
        <em>${backstory2.description}</em><br><br>
        <strong>Relationship:</strong> ${rel.text} - ${relBackstory.text}<br>
        <em>${relBackstory.description}</em><br><br>
        Two survivors. 500 miles to safety. One chance.
    `);

    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = 'BEGIN JOURNEY →';
    btn.onclick = () => {
        // Now show stats and start Day 1
        document.getElementById('stats-section').style.display = 'block';
        updateStats();
        showDailyBriefing();
    };
    
    choicesDiv.appendChild(btn);
}

// ============================================================================
// INIT
// ============================================================================

function startGame() {
    showCharacterCreation();
}