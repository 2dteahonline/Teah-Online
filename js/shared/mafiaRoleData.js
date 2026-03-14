// ===================== MAFIA ROLE DATA =====================
// Role definitions, settings defaults, and assignment logic.
// Loaded in Phase A (shared data), before authority/rendering.

const MAFIA_ROLES = {
    // ---- Crewmate Roles ----
    engineer: {
        id: 'engineer',
        name: 'Engineer',
        team: 'crewmate',
        description: 'Can use vents to move around the map quickly.',
        color: '#f5a623',
        settings: {
            ventCooldown:  { label: 'Vent Cooldown',      default: 15,  min: 0,   max: 60,  step: 5, unit: 's' },
            ventDuration:  { label: 'Max Time in Vent',    default: 30,  min: 5,   max: 120, step: 5, unit: 's' }
        }
    },
    tracker: {
        id: 'tracker',
        name: 'Tracker',
        team: 'crewmate',
        description: 'Can track a player and see their position on the map.',
        color: '#4ac9e3',
        settings: {
            trackDuration: { label: 'Track Duration',      default: 15,  min: 5,   max: 60,  step: 5, unit: 's' },
            trackCooldown: { label: 'Track Cooldown',       default: 30,  min: 10,  max: 120, step: 5, unit: 's' }
        }
    },
    noisemaker: {
        id: 'noisemaker',
        name: 'Noisemaker',
        team: 'crewmate',
        description: 'Triggers a visible alert on the map when killed.',
        color: '#e8d44d',
        settings: {
            alertDuration: { label: 'Alert Duration',       default: 10,  min: 3,   max: 30,  step: 1, unit: 's' }
        }
    },
    scientist: {
        id: 'scientist',
        name: 'Scientist',
        team: 'crewmate',
        description: 'Can check the vitals panel from anywhere on the map.',
        color: '#7ed321',
        settings: {
            vitalsDuration: { label: 'Vitals Duration',    default: 15,  min: 5,   max: 60,  step: 5, unit: 's' },
            vitalsCooldown: { label: 'Vitals Cooldown',    default: 30,  min: 10,  max: 120, step: 5, unit: 's' }
        }
    },

    // ---- Impostor Roles ----
    shapeshifter: {
        id: 'shapeshifter',
        name: 'Shapeshifter',
        team: 'impostor',
        description: 'Can disguise as another player. Can kill while shifted.',
        color: '#bd10e0',
        settings: {
            shiftDuration: { label: 'Shift Duration',      default: 20,  min: 5,   max: 60,  step: 5, unit: 's' },
            shiftCooldown: { label: 'Shift Cooldown',       default: 30,  min: 10,  max: 120, step: 5, unit: 's' }
        }
    },
    phantom: {
        id: 'phantom',
        name: 'Phantom',
        team: 'impostor',
        description: 'Can turn fully invisible. Cannot kill while invisible.',
        color: '#6a0dad',
        settings: {
            invisDuration: { label: 'Invis Duration',      default: 10,  min: 3,   max: 30,  step: 1, unit: 's' },
            invisCooldown: { label: 'Invis Cooldown',       default: 25,  min: 10,  max: 60,  step: 5, unit: 's' }
        }
    },
    viper: {
        id: 'viper',
        name: 'Viper',
        team: 'impostor',
        description: 'Bodies dissolve shortly after a kill, removing evidence.',
        color: '#d0021b',
        settings: {
            dissolveTime:  { label: 'Dissolve Time',       default: 30,  min: 10,  max: 120, step: 5, unit: 's' }
        }
    }
};

// Default percentage chances for each role to be assigned
const MAFIA_ROLE_DEFAULTS = {
    engineerChance:     30,
    trackerChance:      20,
    noisemakerChance:   20,
    scientistChance:    20,
    shapeshifterChance: 30,
    phantomChance:      20,
    viperChance:        20
};

// Runtime settings — initialized from defaults
// Contains both chance percentages AND each role's specific settings
const MAFIA_ROLE_SETTINGS = (function() {
    const s = {};
    // Copy chance percentages
    for (const key in MAFIA_ROLE_DEFAULTS) {
        s[key] = MAFIA_ROLE_DEFAULTS[key];
    }
    // Copy each role's specific settings from their defaults
    for (const roleId in MAFIA_ROLES) {
        const role = MAFIA_ROLES[roleId];
        for (const settingKey in role.settings) {
            s[settingKey] = role.settings[settingKey].default;
        }
    }
    return s;
})();

/**
 * Assigns roles to participants after impostor(s) have been chosen.
 * - First assigns impostor(s) randomly to bots
 * - Then rolls subroles for impostors (weighted by chance)
 * - Then rolls subroles for crewmates (weighted by chance)
 * Sets participant.role ('crewmate'|'impostor') and participant.subrole (role id or null).
 * @param {Array} participants - Array of participant objects (already created as 'crewmate')
 * @param {number} [impostorCount] - Number of impostors to assign (defaults to MafiaState/settings impostors or 1)
 * @returns {Array} The updated participants array
 */
function assignRoles(participants, impostorCount) {
    const count = impostorCount != null ? impostorCount : 1;

    // Collect bots only (player cannot be impostor in single-player context)
    const bots = participants.filter(p => p.isBot);
    const shuffledBots = bots.slice().sort(() => Math.random() - 0.5);

    // Reset everyone to crewmate with no subrole
    for (const p of participants) {
        p.role = 'crewmate';
        p.subrole = null;
    }

    // Assign impostors from shuffled bots
    const impostorsToAssign = Math.min(count, shuffledBots.length);
    for (let i = 0; i < impostorsToAssign; i++) {
        shuffledBots[i].role = 'impostor';
    }

    // --- Helper: weighted random pick from role candidates ---
    function weightedPick(candidates) {
        // candidates = [ { id, chance }, ... ]
        const totalWeight = candidates.reduce((sum, c) => sum + c.chance, 0);
        if (totalWeight <= 0) return null;
        let roll = Math.random() * totalWeight;
        for (const c of candidates) {
            roll -= c.chance;
            if (roll <= 0) return c.id;
        }
        return candidates[candidates.length - 1].id;
    }

    // --- Assign impostor subroles ---
    const impostorRoles = [
        { id: 'shapeshifter', chance: MAFIA_ROLE_SETTINGS.shapeshifterChance },
        { id: 'phantom',      chance: MAFIA_ROLE_SETTINGS.phantomChance },
        { id: 'viper',        chance: MAFIA_ROLE_SETTINGS.viperChance }
    ].filter(r => r.chance > 0);

    for (const p of participants) {
        if (p.role !== 'impostor') continue;
        if (impostorRoles.length === 0) continue;
        // Roll: chance to get any subrole vs staying base impostor
        // Total chance is sum of all impostor role chances (max 100)
        const totalChance = impostorRoles.reduce((s, r) => s + r.chance, 0);
        const roll = Math.random() * 100;
        if (roll < totalChance) {
            p.subrole = weightedPick(impostorRoles);
        }
    }

    // --- Assign crewmate subroles ---
    const crewmateRoles = [
        { id: 'engineer',    chance: MAFIA_ROLE_SETTINGS.engineerChance },
        { id: 'tracker',     chance: MAFIA_ROLE_SETTINGS.trackerChance },
        { id: 'noisemaker',  chance: MAFIA_ROLE_SETTINGS.noisemakerChance },
        { id: 'scientist',   chance: MAFIA_ROLE_SETTINGS.scientistChance }
    ].filter(r => r.chance > 0);

    for (const p of participants) {
        if (p.role !== 'crewmate') continue;
        if (crewmateRoles.length === 0) continue;
        const totalChance = crewmateRoles.reduce((s, r) => s + r.chance, 0);
        const roll = Math.random() * 100;
        if (roll < totalChance) {
            p.subrole = weightedPick(crewmateRoles);
        }
    }

    return participants;
}
