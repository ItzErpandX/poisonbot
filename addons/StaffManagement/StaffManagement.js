const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const yaml = require('js-yaml');
const moment = require('moment');
const { randomUUID } = require('crypto');
const prisma = require('../../database');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function centerText(text, width) {
  const padding = Math.max(0, width - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

function createInfoLine(label, value, width) {
  const content = `  ${label}: ${value}`;
  const padding = Math.max(0, width - content.length);
  return `║${content}${' '.repeat(padding)}║`;
}

class StaffManagement {
  constructor(client) {
    this.client = client;
    this.config = null;
    this.lang = null;
    this.roleHierarchy = new Map();
    this.roleNames = new Map();
    this.roleKeys = new Map();
    this.staffList = new Map();
    this.staffListEmbed = null;
    this.updateTimeout = null;
    this.messageId = null;
    this.pendingConfirmations = new Map();
    this.debugEnabled = false;
    this.isInitialized = false;
    this.boxWidth = 62;
    this.isManualAction = false;
  }


  staffLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    let colorCode = colors.white;
    let prefix = 'INFO';

    switch (type) {
      case 'loading':
        colorCode = colors.cyan;
        prefix = 'LOADING';
        break;
      case 'success':
        colorCode = colors.green;
        prefix = 'SUCCESS';
        break;
      case 'error':
        colorCode = colors.red;
        prefix = 'ERROR';
        break;
      case 'warning':
        colorCode = colors.yellow;
        prefix = 'WARNING';
        break;
      case 'info':
        colorCode = colors.blue;
        prefix = 'INFO';
        break;
    }

    console.log(`${colorCode}[${timestamp}] [${prefix}] [STAFF_MGMT] ${message}${colors.reset}`);
  }


  displayLoadingBanner() {
    console.log('');
    console.log(`${colors.magenta}${colors.bright}╔${'═'.repeat(this.boxWidth)}╗${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText('', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText('   _____ _____  __  __', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText('  / ____|  __ \\|  \\/  |', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText(' | (___ | |__) | \\  / |', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText('  \\___ \\|  ___/| |\\/| |', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText('  ____) | |    | |  | |', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText(' |_____/|_|    |_|  |_|', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText('', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText('LOADING STAFF MANAGEMENT', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}║${centerText('', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.magenta}${colors.bright}╚${'═'.repeat(this.boxWidth)}╝${colors.reset}`);
    console.log('');
  }


  displayCompletionBanner() {
    const staffRoleCount = this.roleNames.size;
    const featuresEnabled = Object.values(this.config.features).filter(Boolean).length;
    const strikeSystem = this.config.features.strikeSystem ? 'Enabled' : 'Disabled';
    const confirmations = this.config.features.requireConfirmation ? 'Enabled' : 'Disabled';

    console.log('');
    console.log(`${colors.green}${colors.bright}╔${'═'.repeat(this.boxWidth)}╗${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║${centerText('', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║${centerText('STAFF MANAGEMENT LOADED', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║${centerText('', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}${createInfoLine('Server', this.config.serverName, this.boxWidth)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}${createInfoLine('Staff Roles', staffRoleCount.toString(), this.boxWidth)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}${createInfoLine('Features Enabled', featuresEnabled.toString(), this.boxWidth)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}${createInfoLine('Strike System', strikeSystem, this.boxWidth)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}${createInfoLine('Confirmations', confirmations, this.boxWidth)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║${centerText('', this.boxWidth)}║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}╚${'═'.repeat(this.boxWidth)}╝${colors.reset}`);
    console.log('');
  }


  async waitForOtherAddons() {
    return new Promise(resolve => {

      setTimeout(resolve, 2000);
    });
  }


  async init() {
    try {

      await this.waitForOtherAddons();

      this.displayLoadingBanner();

      this.staffLog('Initializing Staff Management addon...', 'loading');

      this.staffLog('Loading configuration files...', 'loading');
      await this.loadConfigurations();
      this.staffLog('Configuration loaded successfully', 'success');

      this.staffLog('Validating configuration...', 'loading');
      this.validateConfig();
      this.staffLog('Configuration validated successfully', 'success');

      this.staffLog('Setting up role hierarchy...', 'loading');
      this.setupRoles();
      this.staffLog(`Role hierarchy configured (${this.roleNames.size} roles)`, 'success');

      this.staffLog('Initializing staff list system...', 'loading');
      await this.initializeStaffList();
      this.staffLog('Staff list system initialized', 'success');

      if (this.config.features.strikeSystem) {
        this.staffLog('Starting strike cleanup service...', 'loading');
        this.cleanupExpiredStrikes();
        this.startStrikeCleanup();
        this.staffLog('Strike cleanup service started', 'success');
      }

      this.staffLog('Registering event handlers...', 'loading');
      this.registerEventHandlers();
      this.staffLog('Event handlers registered', 'success');

      this.isInitialized = true;
      this.staffLog('Staff Management initialization complete!', 'success');

      this.displayCompletionBanner();

    } catch (error) {
      this.staffLog(`Failed to initialize: ${error.message}`, 'error');
      console.error(`${colors.red}[STAFF_MGMT ERROR] ${error.stack}${colors.reset}`);
    }
  }


  registerEventHandlers() {

    this.client.staffManagement = this;

    if (this.config.features.promotionDemotionMessages) {
      this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
        try {
          await this.handleMemberUpdate(oldMember, newMember);
        } catch (error) {
          this.error(`Error handling member update: ${error.message}`);
        }
      });
    }

    if (this.config.features.staffListUpdates) {
      this.client.on('guildMemberUpdate', async (_, newMember) => {
        try {
          await this.updateStaffList(newMember.guild);
        } catch (error) {
          this.error(`Error updating staff list update: ${error.message}`);
        }
      });
    }

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;

      if (interaction.customId.startsWith('confirm_') || interaction.customId.startsWith('cancel_')) {
        try {
          await this.handleConfirmation(interaction);
        } catch (error) {
          this.error(`Error handling confirmation: ${error.message}`);
        }
      }
    });
  }


  async loadConfigurations() {
    this.debug('Loading configuration files...');

    const configFile = await fs.readFile('./addons/StaffManagement/configs/config.yml', 'utf8');
    const langFile = await fs.readFile('./addons/StaffManagement/configs/lang.yml', 'utf8');

    this.config = yaml.load(configFile);
    this.lang = yaml.load(langFile);

    this.debug(`Config loaded: serverName = ${JSON.stringify(this.config.serverName)}`);
    this.debug(`Lang loaded: staffList.title = ${JSON.stringify(this.lang.staffList?.title)}`);
    this.debug(`Config roles: ${JSON.stringify(Object.keys(this.config.roles || {}))}`);
  }


  validateConfig() {
    const requiredFields = [
      { field: 'serverName', value: this.config.serverName },
      { field: 'staffListChannelId', value: this.config.staffListChannelId },
      { field: 'promotionDemotionChannelId', value: this.config.promotionDemotionChannelId }
    ];

    for (const { field, value } of requiredFields) {
      if (!value || value === 'CHANNEL_ID_HERE') {
        throw new Error(`Missing or invalid ${field} in config. Please set a valid channel ID.`);
      }
    }

    if (!this.config.roles || typeof this.config.roles !== 'object') {
      throw new Error('Invalid roles configuration');
    }

    for (const [key, role] of Object.entries(this.config.roles)) {
      if (!role.id || !role.name || !role.hierarchy) {
        throw new Error(`Invalid role configuration for ${key}: missing id, name, or hierarchy`);
      }
    }

    this.debug(this.lang.logs.configValidated);
  }


  setupRoles() {
    for (const [key, role] of Object.entries(this.config.roles)) {
      this.roleHierarchy.set(role.id, role.hierarchy);
      this.roleNames.set(role.id, role.name);
      this.roleKeys.set(role.id, key);
    }
  }


  async initializeStaffList() {
    this.debug('Starting staff list initialization...');
    const guild = this.client.guilds.cache.first();
    this.debug(`Guild found: ${guild ? guild.name : 'None'}`);

    if (guild) {

      this.debug('Fetching staff members by role...');
      await this.fetchStaffMembers(guild);
      this.debug(`Staff list generated: ${this.staffList.size} staff members`);

      this.debug('Creating staff list embed...');
      this.staffListEmbed = this.createStaffListEmbed();
      this.debug('Staff list embed created successfully');

      this.debug('Sending/updating staff list message...');
      await this.sendOrUpdateStaffListMessage();
      this.debug('Staff list message sent/updated successfully');

      setTimeout(async () => {
        try {
          await this.updateStaffList(guild);
        } catch (err) {
          this.error(`Post-init staff list update failed: ${err.message}`);
        }
      }, 5000);
    } else {
      this.error('No guild found for staff list initialization');
    }
  }


  startStrikeCleanup() {
    if (!this.config.features.strikeSystem) return;

    setInterval(async () => {
      try {
        await this.cleanupExpiredStrikes();
      } catch (error) {
        this.error(`Error during strike cleanup: ${error.message}`);
      }
    }, 60000 * 60);
  }


  debug(message) {
    if (this.config?.features?.debug) {
      this.staffLog(message, 'info');
    }
  }


  error(message) {
    this.staffLog(message, 'error');
  }


  replacePlaceholders(text, replacements) {
    let result = text;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  }


  hasPermission(member, action) {
    const allowedRoles = this.config.permissions[action] || [];
    return member.roles.cache.some(role => allowedRoles.includes(role.id));
  }


  getHighestStaffRole(member) {
    let highestRole = null;
    let highestHierarchy = 0;

    for (const role of member.roles.cache.values()) {
      const hierarchy = this.roleHierarchy.get(role.id);
      if (hierarchy && hierarchy > highestHierarchy) {
        highestHierarchy = hierarchy;
        highestRole = role;
      }
    }

    return highestRole;
  }


  getRoleByHierarchy(targetHierarchy) {
    for (const [roleId, hierarchy] of this.roleHierarchy.entries()) {
      if (hierarchy === targetHierarchy) {
        return roleId;
      }
    }
    return null;
  }


  getNextRole(currentRoleId) {
    const currentHierarchy = this.roleHierarchy.get(currentRoleId);
    if (!currentHierarchy) return null;

    return this.getRoleByHierarchy(currentHierarchy + 1);
  }


  getPreviousRole(currentRoleId) {
    const currentHierarchy = this.roleHierarchy.get(currentRoleId);
    if (!currentHierarchy) return null;

    return this.getRoleByHierarchy(currentHierarchy - 1);
  }


  isFirstTimeStaff(member) {
    return !member.roles.cache.some(role => this.roleHierarchy.has(role.id));
  }


  hasAnyStaffRole(member) {
    return member.roles.cache.some(role => this.roleHierarchy.has(role.id));
  }


  async removeAdditionalRoles(member, moderator = null, reason = null) {
    try {

      if (!this.config.removeAdditionalRolesOnDemotion) {
        this.debug('Additional role removal is disabled in configuration');
        return;
      }

      if (this.hasAnyStaffRole(member)) {
        this.debug(`${member.user.tag} still has staff roles, not removing additional roles`);
        return;
      }

      if (!this.config.additionalRoles?.onFirstPromotion) {
        this.debug('No additional roles configured to remove');
        return;
      }

      const rolesToRemove = [];
      for (const additionalRole of this.config.additionalRoles.onFirstPromotion) {
        if (member.roles.cache.has(additionalRole.id)) {
          const role = member.guild.roles.cache.get(additionalRole.id);
          if (role) {
            rolesToRemove.push(role);
          }
        }
      }

      if (rolesToRemove.length === 0) {
        this.debug(`${member.user.tag} doesn't have any additional roles to remove`);
        return;
      }

      await member.roles.remove(rolesToRemove, 'Staff Management: Removing additional roles after complete demotion');

      const removedRoleNames = rolesToRemove.map(role => role.name).join(', ');
      this.debug(`Removed additional roles from ${member.user.tag}: ${removedRoleNames}`);

      if (this.config.features.logActions && moderator) {
        await this.logAdditionalRoleRemoval(member, rolesToRemove, moderator, reason);
      }

    } catch (error) {
      this.error(`Error removing additional roles from ${member.user.tag}: ${error.message}`);
    }
  }


  async logAdditionalRoleRemoval(member, removedRoles, moderator, reason) {
    try {
      if (!this.config.logChannelId) return;

      const channel = await this.client.channels.fetch(this.config.logChannelId);
      if (!channel) return;

      const removedRoleNames = removedRoles.map(role => role.name).join(', ');

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Additional Roles Removed')
        .setDescription(`Additional staff roles have been removed from ${member.user.username}`)
        .setColor(this.config.embedColors.warning)
        .setTimestamp();

      embed.addFields(
        {
          name: '👤 User',
          value: `${member.toString()} (${member.user.tag})`,
          inline: true
        },
        {
          name: '🔨 Action by',
          value: `${moderator.toString()} (${moderator.tag})`,
          inline: true
        },
        {
          name: '🏷️ Roles removed',
          value: removedRoleNames,
          inline: false
        }
      );

      if (reason) {
        embed.addFields({
          name: '📝 Reason',
          value: reason,
          inline: false
        });
      }

//      embed.addFields({
//        name: '🕐 Time',
//        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
//        inline: true
//      });

      await channel.send({ embeds: [embed] });

    } catch (error) {
      this.error(`Error logging additional role removal: ${error.message}`);
    }
  }


  parseDuration(durationStr) {
    if (!durationStr) return null;

    const match = durationStr.match(/^(\d+)([dhm])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    return value * multipliers[unit];
  }


  generateStrikeId() {
    return randomUUID().split('-')[0].toUpperCase();
  }


  async promoteUser(interaction, targetUser, targetRoleId = null, reason = null) {
    try {

      if (!this.hasPermission(interaction.member, 'canPromote')) {
        return await interaction.reply({
          content: this.lang.commands.noPermission,
          ephemeral: true
        });
      }

      if (targetUser.id === interaction.user.id) {
        return await interaction.reply({
          content: this.lang.commands.errors.cannotPromoteSelf,
          ephemeral: true
        });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const currentRole = this.getHighestStaffRole(targetMember);
      const isFirstTime = this.isFirstTimeStaff(targetMember);

      let newRoleId;
      if (targetRoleId) {

        if (!this.roleHierarchy.has(targetRoleId)) {
          return await interaction.reply({
            content: this.lang.commands.errors.roleNotFound,
            ephemeral: true
          });
        }
        newRoleId = targetRoleId;
      } else {

        if (!currentRole && !isFirstTime) {
          return await interaction.reply({
            content: this.lang.commands.promote.noStaffRole.replace('{user}', targetUser.toString()),
            ephemeral: true
          });
        }

        if (isFirstTime) {

          let lowestHierarchy = Infinity;
          for (const hierarchy of this.roleHierarchy.values()) {
            if (hierarchy < lowestHierarchy) {
              lowestHierarchy = hierarchy;
            }
          }
          newRoleId = this.getRoleByHierarchy(lowestHierarchy);
        } else {
          newRoleId = this.getNextRole(currentRole.id);
        }

        if (!newRoleId) {
          return await interaction.reply({
            content: this.lang.commands.promote.alreadyHighest.replace('{user}', targetUser.toString()),
            ephemeral: true
          });
        }
      }

      if (targetMember.roles.cache.has(newRoleId)) {
        return await interaction.reply({
          content: this.lang.commands.promote.sameRole
            .replace('{user}', targetUser.toString())
            .replace('{role}', this.roleNames.get(newRoleId)),
          ephemeral: true
        });
      }

      const newRoleHierarchy = this.roleHierarchy.get(newRoleId);

      // Prevent promoting to a lower rank
      if (currentRole) {
        const currentRoleHierarchy = this.roleHierarchy.get(currentRole.id);
        if (newRoleHierarchy < currentRoleHierarchy) {
          return await interaction.reply({
            content: `❌ You cannot promote ${targetUser.toString()} to a lower rank. They currently have **${currentRole.name}** (Rank ${currentRoleHierarchy}), but **${this.roleNames.get(newRoleId)}** is only Rank ${newRoleHierarchy}.`,
            ephemeral: true
          });
        }
      }

      const moderatorRole = this.getHighestStaffRole(interaction.member);
      const moderatorHierarchy = moderatorRole ? this.roleHierarchy.get(moderatorRole.id) : 0;

      if (newRoleHierarchy >= moderatorHierarchy) {
        return await interaction.reply({
          content: this.lang.commands.promote.cannotPromoteHigher,
          ephemeral: true
        });
      }

      if (this.config.features.requireConfirmation) {
        await this.showPromotionConfirmation(interaction, targetUser, currentRole, newRoleId, reason, isFirstTime);
      } else {
        await this.executePromotion(interaction, targetUser, currentRole, newRoleId, reason, isFirstTime);
      }

    } catch (error) {
      this.error(`Error in promoteUser: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while processing the promotion.',
        ephemeral: true
      });
    }
  }


  async showPromotionConfirmation(interaction, targetUser, currentRole, newRoleId, reason, isFirstTime) {
    const newRole = interaction.guild.roles.cache.get(newRoleId);
    const confirmationId = randomUUID();

    const embed = new EmbedBuilder()
      .setTitle(this.lang.confirmations.promote.title)
      .setDescription(this.lang.confirmations.promote.description.replace('{user}', targetUser.toString()))
      .setColor(this.config.embedColors.promotion)
      .addFields(
        {
          name: this.lang.confirmations.promote.fields.user,
          value: targetUser.toString(),
          inline: true
        },
        {
          name: this.lang.confirmations.promote.fields.currentRole,
          value: currentRole ? currentRole.name : 'Member',
          inline: true
        },
        {
          name: this.lang.confirmations.promote.fields.newRole,
          value: newRole.name,
          inline: true
        }
      );

    if (reason) {
      embed.addFields({
        name: this.lang.confirmations.promote.fields.reason,
        value: reason,
        inline: false
      });
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_promote_${confirmationId}`)
          .setLabel(this.lang.confirmations.promote.buttons.confirm)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`cancel_promote_${confirmationId}`)
          .setLabel(this.lang.confirmations.promote.buttons.cancel)
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    this.pendingConfirmations.set(confirmationId, {
      type: 'promotion',
      moderator: interaction.user,
      targetUser,
      currentRole,
      newRoleId,
      reason,
      isFirstTime,
      timestamp: Date.now()
    });

    setTimeout(() => {
      if (this.pendingConfirmations.has(confirmationId)) {
        this.pendingConfirmations.delete(confirmationId);
      }
    }, this.config.cooldowns.confirmationTimeout * 1000);
  }


  async executePromotion(interaction, targetUser, currentRole, newRoleId, reason, isFirstTime) {
    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const newRole = interaction.guild.roles.cache.get(newRoleId);

      this.isManualAction = true;

      await targetMember.roles.add(newRole);

      if (currentRole) {
        await targetMember.roles.remove(currentRole);
      }

      if (isFirstTime && this.config.additionalRoles?.onFirstPromotion) {
        for (const additionalRole of this.config.additionalRoles.onFirstPromotion) {
          const role = interaction.guild.roles.cache.get(additionalRole.id);
          if (role) {
            await targetMember.roles.add(role);
          }
        }
      }

      setTimeout(() => {
        this.isManualAction = false;
      }, 1000);

      const oldRoleName = currentRole ? currentRole.name : 'Member';
      const newRoleName = newRole.name;

      const successMessage = this.lang.commands.promote.success
        .replace('{user}', targetUser.toString())
        .replace('{oldrole}', oldRoleName)
        .replace('{newrole}', newRoleName);

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: successMessage, embeds: [], components: [] });
      } else {
        await interaction.reply({ content: successMessage, ephemeral: true });
      }

      await this.handleRoleChange(targetMember, oldRoleName, newRoleName, 'promotion', interaction.user, reason, isFirstTime);

      await this.logToHistory('promotion', targetUser, interaction.user, oldRoleName, newRoleName, reason);

    } catch (error) {
      this.isManualAction = false;
      this.error(`Error executing promotion: ${error.message}`);
      throw error;
    }
  }


  async demoteUser(interaction, targetUser, targetRoleId = null, reason = null) {
    try {

      if (!this.hasPermission(interaction.member, 'canDemote')) {
        return await interaction.reply({
          content: this.lang.commands.noPermission,
          ephemeral: true
        });
      }

      if (targetUser.id === interaction.user.id) {
        return await interaction.reply({
          content: this.lang.commands.errors.cannotDemoteSelf,
          ephemeral: true
        });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const currentRole = this.getHighestStaffRole(targetMember);

      if (!currentRole) {
        return await interaction.reply({
          content: this.lang.commands.demote.noStaffRole.replace('{user}', targetUser.toString()),
          ephemeral: true
        });
      }

      let newRoleId;
      if (targetRoleId) {

        if (!this.roleHierarchy.has(targetRoleId)) {
          return await interaction.reply({
            content: this.lang.commands.errors.roleNotFound,
            ephemeral: true
          });
        }
        newRoleId = targetRoleId;
      } else {

        newRoleId = this.getPreviousRole(currentRole.id);
      }

      if (newRoleId && targetMember.roles.cache.has(newRoleId)) {
        return await interaction.reply({
          content: this.lang.commands.demote.sameRole
            .replace('{user}', targetUser.toString())
            .replace('{role}', this.roleNames.get(newRoleId)),
          ephemeral: true
        });
      }

      // Prevent demoting to a higher rank
      if (newRoleId) {
        const newRoleHierarchy = this.roleHierarchy.get(newRoleId);
        const currentRoleHierarchy = this.roleHierarchy.get(currentRole.id);
        if (newRoleHierarchy > currentRoleHierarchy) {
          return await interaction.reply({
            content: `❌ You cannot demote ${targetUser.toString()} to a higher rank. They currently have **${currentRole.name}** (Rank ${currentRoleHierarchy}), but **${this.roleNames.get(newRoleId)}** is Rank ${newRoleHierarchy}.`,
            ephemeral: true
          });
        }
      }

      const moderatorRole = this.getHighestStaffRole(interaction.member);
      const currentRoleHierarchy = this.roleHierarchy.get(currentRole.id);
      const moderatorHierarchy = moderatorRole ? this.roleHierarchy.get(moderatorRole.id) : 0;

      if (currentRoleHierarchy >= moderatorHierarchy) {
        return await interaction.reply({
          content: this.lang.commands.demote.cannotDemoteHigher,
          ephemeral: true
        });
      }

      if (this.config.features.requireConfirmation) {
        await this.showDemotionConfirmation(interaction, targetUser, currentRole, newRoleId, reason);
      } else {
        await this.executeDemotion(interaction, targetUser, currentRole, newRoleId, reason);
      }

    } catch (error) {
      this.error(`Error in demoteUser: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while processing the demotion.',
        ephemeral: true
      });
    }
  }


  async showDemotionConfirmation(interaction, targetUser, currentRole, newRoleId, reason) {
    const newRole = newRoleId ? interaction.guild.roles.cache.get(newRoleId) : null;
    const confirmationId = randomUUID();

    const embed = new EmbedBuilder()
      .setTitle(this.lang.confirmations.demote.title)
      .setDescription(this.lang.confirmations.demote.description.replace('{user}', targetUser.toString()))
      .setColor(this.config.embedColors.demotion)
      .addFields(
        {
          name: this.lang.confirmations.demote.fields.user,
          value: targetUser.toString(),
          inline: true
        },
        {
          name: this.lang.confirmations.demote.fields.currentRole,
          value: currentRole.name,
          inline: true
        },
        {
          name: this.lang.confirmations.demote.fields.newRole,
          value: newRole ? newRole.name : 'Member',
          inline: true
        }
      );

    if (reason) {
      embed.addFields({
        name: this.lang.confirmations.demote.fields.reason,
        value: reason,
        inline: false
      });
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_demote_${confirmationId}`)
          .setLabel(this.lang.confirmations.demote.buttons.confirm)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cancel_demote_${confirmationId}`)
          .setLabel(this.lang.confirmations.demote.buttons.cancel)
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    this.pendingConfirmations.set(confirmationId, {
      type: 'demotion',
      moderator: interaction.user,
      targetUser,
      currentRole,
      newRoleId,
      reason,
      timestamp: Date.now()
    });

    setTimeout(() => {
      if (this.pendingConfirmations.has(confirmationId)) {
        this.pendingConfirmations.delete(confirmationId);
      }
    }, this.config.cooldowns.confirmationTimeout * 1000);
  }


  async executeDemotion(interaction, targetUser, currentRole, newRoleId, reason) {
    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      this.isManualAction = true;

      await targetMember.roles.remove(currentRole);

      if (newRoleId) {
        const newRole = interaction.guild.roles.cache.get(newRoleId);
        await targetMember.roles.add(newRole);
      }

      if (!newRoleId) {
        await this.removeAdditionalRoles(targetMember, interaction.user, reason);
      }

      setTimeout(() => {
        this.isManualAction = false;
      }, 1000);

      const oldRoleName = currentRole.name;
      const newRoleName = newRoleId ? this.roleNames.get(newRoleId) : null;

      const successMessage = newRoleId
        ? this.lang.commands.demote.success
          .replace('{user}', targetUser.toString())
          .replace('{oldrole}', oldRoleName)
          .replace('{newrole}', newRoleName)
        : this.lang.commands.remove.success.replace('{user}', targetUser.toString());

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: successMessage, embeds: [], components: [] });
      } else {
        await interaction.reply({ content: successMessage, ephemeral: true });
      }

      const changeType = newRoleId ? 'demotion' : 'demotedAll';
      await this.handleRoleChange(targetMember, oldRoleName, newRoleName, changeType, interaction.user, reason);

      await this.logToHistory('demotion', targetUser, interaction.user, oldRoleName, newRoleName, reason);

    } catch (error) {
      this.isManualAction = false;
      this.error(`Error executing demotion: ${error.message}`);
      throw error;
    }
  }


  async removeUser(interaction, targetUser, reason = null) {
    try {

      if (!this.hasPermission(interaction.member, 'canDemote')) {
        return await interaction.reply({
          content: this.lang.commands.noPermission,
          ephemeral: true
        });
      }

      if (targetUser.id === interaction.user.id) {
        return await interaction.reply({
          content: this.lang.commands.errors.cannotRemoveSelf,
          ephemeral: true
        });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const currentRole = this.getHighestStaffRole(targetMember);

      if (!currentRole) {
        return await interaction.reply({
          content: this.lang.commands.remove.noStaffRole.replace('{user}', targetUser.toString()),
          ephemeral: true
        });
      }

      const moderatorRole = this.getHighestStaffRole(interaction.member);
      const currentRoleHierarchy = this.roleHierarchy.get(currentRole.id);
      const moderatorHierarchy = moderatorRole ? this.roleHierarchy.get(moderatorRole.id) : 0;

      if (currentRoleHierarchy >= moderatorHierarchy) {
        return await interaction.reply({
          content: this.lang.commands.errors.higherRole,
          ephemeral: true
        });
      }

      if (this.config.features.requireConfirmation) {
        await this.showRemovalConfirmation(interaction, targetUser, currentRole, reason);
      } else {
        await this.executeRemoval(interaction, targetUser, currentRole, reason);
      }

    } catch (error) {
      this.error(`Error in removeUser: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while removing staff roles.',
        ephemeral: true
      });
    }
  }


  async showRemovalConfirmation(interaction, targetUser, currentRole, reason) {
    const confirmationId = randomUUID();

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Confirm Staff Removal')
      .setDescription(`Are you sure you want to remove all staff roles from ${targetUser.toString()}?`)
      .setColor(this.config.embedColors.demotion)
      .addFields(
        {
          name: '👤 User',
          value: targetUser.toString(),
          inline: true
        },
        {
          name: '📋 Current role',
          value: currentRole.name,
          inline: true
        },
        {
          name: '🏆 New role',
          value: 'Member',
          inline: true
        }
      );

    if (reason) {
      embed.addFields({
        name: '📝 Reason',
        value: `\`\`\`${reason}\`\`\``,
        inline: false
      });
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_remove_${confirmationId}`)
          .setLabel('✅ Confirm')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cancel_remove_${confirmationId}`)
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    this.pendingConfirmations.set(confirmationId, {
      type: 'removal',
      moderator: interaction.user,
      targetUser,
      currentRole,
      reason,
      timestamp: Date.now()
    });

    setTimeout(() => {
      if (this.pendingConfirmations.has(confirmationId)) {
        this.pendingConfirmations.delete(confirmationId);
      }
    }, this.config.cooldowns.confirmationTimeout * 1000);
  }


  async executeRemoval(interaction, targetUser, currentRole, reason) {
    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      this.isManualAction = true;

      const staffRoles = targetMember.roles.cache.filter(role => this.roleHierarchy.has(role.id));
      await targetMember.roles.remove(staffRoles);

      await this.removeAdditionalRoles(targetMember, interaction.user, reason);

      setTimeout(() => {
        this.isManualAction = false;
      }, 1000);

      const oldRoleName = currentRole.name;

      const successMessage = this.lang.commands.remove.success.replace('{user}', targetUser.toString());

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: successMessage, embeds: [], components: [] });
      } else {
        await interaction.reply({ content: successMessage, ephemeral: true });
      }

      await this.handleRoleChange(targetMember, oldRoleName, null, 'demotedAll', interaction.user, reason);

      await this.logToHistory('removal', targetUser, interaction.user, oldRoleName, null, reason);

    } catch (error) {
      this.isManualAction = false;
      this.error(`Error executing removal: ${error.message}`);
      throw error;
    }
  }


  async handleMemberUpdate(oldMember, newMember) {

    if (this.isManualAction) {
      return;
    }

    const oldRoles = oldMember.roles.cache.map(role => role.id);
    const newRoles = newMember.roles.cache.map(role => role.id);

    const staffRoleIds = Array.from(this.roleHierarchy.keys());

    let oldStaffRole = oldRoles.find(role => staffRoleIds.includes(role));
    let newStaffRole = newRoles.find(role => staffRoleIds.includes(role));

    if (oldStaffRole !== newStaffRole) {
      let changeType;
      if (!oldStaffRole) {
        changeType = 'promotion';
      } else if (!newStaffRole) {
        changeType = 'demotedAll';
      } else {
        changeType = this.roleHierarchy.get(newStaffRole) > this.roleHierarchy.get(oldStaffRole) ? 'promotion' : 'demotion';
      }

      const oldRoleName = oldStaffRole ? this.roleNames.get(oldStaffRole) : null;
      const newRoleName = newStaffRole ? this.roleNames.get(newStaffRole) : null;

      await this.handleRoleChange(newMember, oldRoleName, newRoleName, changeType);
    }
  }


  async handleRoleChange(member, oldRole, newRole, changeType, moderator = null, reason = null, isFirstTime = false) {

    if (moderator) {
      await this.sendPromotionDemotionMessage(member, oldRole, newRole, changeType, moderator, reason);
    }

    if (this.config.features.sendDM && moderator) {
      await this.sendDM(member, oldRole, newRole, changeType, isFirstTime);
    }

    if (this.config.features.logActions && moderator) {
      await this.logAction(changeType, member, moderator, oldRole, newRole, reason);
    }

    this.debug(`${member.user.tag} ${changeType}: ${oldRole || 'Member'} -> ${newRole || 'Member'}`);
  }


  async sendPromotionDemotionMessage(member, oldRole, newRole, changeType, moderator, reason) {
    try {
      const channel = await this.client.channels.fetch(this.config.promotionDemotionChannelId);
      if (!channel) {
        this.error(this.lang.logs.errors.channelNotFound.replace('{channelId}', this.config.promotionDemotionChannelId));
        return;
      }

      let message;
      let color;

      if (changeType === 'promotion') {
        message = this.lang.messages.channelMessages.promotion
          .replace('{user}', member.toString())
          .replace('{oldrole}', oldRole || 'Member')
          .replace('{newrole}', newRole)
          .replace('{moderator}', moderator.toString());
        color = this.config.embedColors.promotion;
      } else if (changeType === 'demotion') {
        message = this.lang.messages.channelMessages.demotion
          .replace('{user}', member.toString())
          .replace('{oldrole}', oldRole)
          .replace('{newrole}', newRole)
          .replace('{moderator}', moderator.toString());
        color = this.config.embedColors.demotion;
      } else if (changeType === 'demotedAll') {
        message = this.lang.messages.channelMessages.removal
          .replace('{user}', member.toString())
          .replace('{moderator}', moderator.toString());
        color = this.config.embedColors.demotion;
      }

      if (reason) {
        message += `\n**Reason:** ${reason}`;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setDescription(message)
        .setTimestamp();

      if (this.config.embed.footerText?.trim()) {
        const footerText = this.config.embed.footerText.replace('{serverName}', this.config.serverName);
        const footerOptions = { text: footerText };
        if (this.config.embed.footerImage?.trim()) {
          footerOptions.iconURL = this.config.embed.footerImage;
        }
        embed.setFooter(footerOptions);
      }

      let mentionRoleId = null;
      if (changeType === 'promotion' && this.config.RoleNotificationOnPromote) {
        mentionRoleId = this.config.RoleNotificationOnPromote;
      } else if ((changeType === 'demotion' || changeType === 'demotedAll') && this.config.RoleNotificationOnDemote) {
        mentionRoleId = this.config.RoleNotificationOnDemote;
      }

      const sendOptions = { embeds: [embed] };
      if (mentionRoleId && typeof mentionRoleId === 'string' && mentionRoleId.trim()) {
        sendOptions.content = `<@&${mentionRoleId}>`;
        sendOptions.allowedMentions = { roles: [mentionRoleId] };
      }

      await channel.send(sendOptions);
      this.debug(`Successfully sent ${changeType} message for ${member.user.tag}`);
    } catch (error) {
      this.error(`Error sending promotion/demotion message: ${error.message}`);
    }
  }


  async sendDM(member, oldRole, newRole, changeType, isFirstTime = false) {
    try {
      let embed = null;

      if (changeType === 'promotion' && newRole) {

        const newRoleId = Array.from(this.roleNames.entries())
          .find(([id, name]) => name === newRole)?.[0];
        const roleKey = newRoleId ? this.roleKeys.get(newRoleId) : null;

        let message;

        if (roleKey && this.lang.roleMessages[roleKey]?.promotion) {
          message = this.lang.roleMessages[roleKey].promotion;
        } else if (isFirstTime) {
          message = this.lang.messages.firstTimePromotion
            .replace('{serverName}', this.config.serverName)
            .replace('{newrole}', newRole);
        } else {
          message = this.lang.messages.dmMessages.promotion.fallback
            .replace('{oldrole}', oldRole || 'Member')
            .replace('{newrole}', newRole);
        }

        embed = new EmbedBuilder()
          .setTitle(this.lang.messages.dmMessages.promotion.title)
          .setDescription(message)
          .setColor(this.config.embedColors.promotion)
          .setTimestamp();

      } else if (changeType === 'demotion' && newRole) {
        const message = this.lang.messages.dmMessages.demotion.message
          .replace('{oldrole}', oldRole)
          .replace('{newrole}', newRole);

        embed = new EmbedBuilder()
          .setTitle(this.lang.messages.dmMessages.demotion.title)
          .setDescription(message)
          .setColor(this.config.embedColors.demotion)
          .setTimestamp();

      } else if (changeType === 'demotedAll') {
        embed = new EmbedBuilder()
          .setTitle(this.lang.messages.dmMessages.removal.title)
          .setDescription(this.lang.messages.dmMessages.removal.message)
          .setColor(this.config.embedColors.demotion)
          .setTimestamp();
      }

      if (embed) {
        await member.send({ embeds: [embed] });
        this.debug(`Successfully sent DM to ${member.user.tag} for ${changeType}`);
      }

    } catch (error) {
      this.error(this.lang.logs.errors.dmFailed.replace('{user}', member.user.tag).replace('{error}', error.message));
    }
  }

async logAction(actionType, member, moderator, oldRole, newRole, reason) {
    try {
      if (!this.config.logChannelId) return;

      const channel = await this.client.channels.fetch(this.config.logChannelId);
      if (!channel) {
        this.error(this.lang.logs.errors.channelNotFound.replace('{channelId}', this.config.logChannelId));
        return;
      }

      const embedConfig = this.lang.logs.embeds[actionType];
      if (!embedConfig) return;

      const embed = new EmbedBuilder()
        .setTitle(embedConfig.title)
      //  .setDescription(embedConfig.description.replace('{username}', member.user.username))
        .setColor(this.config.embedColors[actionType] || this.config.embedColors.log)
        .setTimestamp();

      embed.addFields(
        {
          name: embedConfig.fields.user,
          value: `${member.toString()} (${member.user.tag})`,
          inline: true
        },
        {
          name: actionType === 'promotion' ? embedConfig.fields.promotedBy : embedConfig.fields.demotedBy,
          value: `${moderator.toString()} (${moderator.tag})`,
          inline: true
        }
      );

      if (oldRole || newRole) {
        const roleChange = oldRole && newRole
          ? `${oldRole} → ${newRole}`
          : oldRole
            ? `${oldRole} → Member`
            : `Member → ${newRole}`;

        embed.addFields({
          name: embedConfig.fields.roleChange,
          value: roleChange,
          inline: true
        });
      }

      if (reason) {
        embed.addFields({
          name: embedConfig.fields.reason,
          value: `\`\`\`${reason}\`\`\``,
          inline: false
        });
      }

      //embed.addFields({
      //  name: embedConfig.fields.timestamp,
      //  value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
      //  inline: true
      //});

      await channel.send({ embeds: [embed] });
      this.debug(`Successfully logged ${actionType} for ${member.user.tag}`);

    } catch (error) {
      this.error(this.lang.logs.errors.logFailed.replace('{error}', error.message));
    }
  }

  async logStrike(strike, moderator, actionType) {
    try {
      if (!this.config.logChannelId) return;

      const channel = await this.client.channels.fetch(this.config.logChannelId);
      if (!channel) return;

      const embedConfig = this.lang.logs.embeds[`strike${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`];
      if (!embedConfig) return;

      const embed = new EmbedBuilder()
        .setTitle(embedConfig.title)
        //.setDescription(embedConfig.description.replace('{username}', strike.username))
        .setColor(this.config.embedColors.strike)
        .setTimestamp();

      embed.addFields(
        {
          name: embedConfig.fields.user,
          value: `<@${strike.userId}> (${strike.username})`,
          inline: true
        },
        {
          name: actionType === 'add' ? embedConfig.fields.issuedBy : embedConfig.fields.removedBy,
          value: `${moderator.toString()} (${moderator.tag})`,
          inline: true
        },
        {
          name: embedConfig.fields.reason,
          value: `\`\`\`${strike.reason}\`\`\``,
          inline: false
        },
        {
          name: embedConfig.fields.strikeId,
          value: strike.strikeId,
          inline: true
        }
      );

      if (actionType === 'add') {
        if (strike.expiresAt) {
          embed.addFields({
            name: embedConfig.fields.expires,
            value: `<t:${Math.floor(strike.expiresAt.getTime() / 1000)}:F>`,
            inline: true
          });
        }

        embed.addFields({
          name: embedConfig.fields.silent,
          value: strike.silent ? 'Yes' : 'No',
          inline: true
        });
      }

      await channel.send({ embeds: [embed] });

    } catch (error) {
      this.error(`Error logging strike: ${error.message}`);
    }
  }


  async logToHistory(type, targetUser, moderator, fromRole, toRole, reason, strikeId = null) {
    try {
      await prisma.staffHistory.create({
        data: {
          guildId: this.client.guilds.cache.first()?.id,
          userId: targetUser.id,
          username: targetUser.username,
          type,
          fromRole,
          toRole,
          reason,
          moderatorId: moderator.id,
          moderatorUsername: moderator.username,
          strikeId
        }
      });
      this.debug(`Logged ${type} to history for ${targetUser.username}`);

    } catch (error) {
      this.error(`Error logging to history: ${error.message}`);
    }
  }


  async getStaffHistory(userId, includeExpired = false) {
    try {
      const guildId = this.client.guilds.cache.first()?.id;

      const history = await prisma.staffHistory.findMany({
        where: {
          guildId,
          userId
        },
        orderBy: { timestamp: 'desc' }
      });

      let strikes;
      if (includeExpired) {
        strikes = await prisma.staffStrike.findMany({
          where: { guildId, userId },
          orderBy: { issuedAt: 'desc' }
        });
      } else {
        const now = new Date();
        strikes = await prisma.staffStrike.findMany({
          where: {
            guildId,
            userId,
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          }
        });
      }

      return { history, strikes };

    } catch (error) {
      this.error(`Error getting staff history: ${error.message}`);
      return { history: [], strikes: [] };
    }
  }


  async fetchStaffMembers(guild) {
    this.debug('Fetching staff members by role...');
    this.staffList.clear();

    this.debug(`Role names map size: ${this.roleNames.size}`);
    this.debug(`Role hierarchy map size: ${this.roleHierarchy.size}`);

    const staffMemberIds = new Set();
    const memberRoleMap = new Map();

    for (const [roleId, roleName] of this.roleNames.entries()) {
      this.debug(`Processing role: ${roleName} (ID: ${roleId})`);

      try {

        let role = guild.roles.cache.get(roleId);
        if (!role) {
          role = await guild.roles.fetch(roleId).catch(() => null);
        }

        if (!role) {
          this.debug(`Role not found in guild: ${roleId}`);
          continue;
        }

        const membersWithRole = await guild.members.fetch({
          query: '',
          limit: 1000
        }).then(members =>
          members.filter(m => m.roles.cache.has(roleId))
        ).catch(async () => {

          await guild.members.fetch();
          return guild.members.cache.filter(m => m.roles.cache.has(roleId));
        });

        this.debug(`Role found: ${role.name}, Members: ${membersWithRole.size}`);

        for (const [memberId, member] of membersWithRole) {
          staffMemberIds.add(memberId);
          const currentHierarchy = this.roleHierarchy.get(roleId);
          const existingEntry = memberRoleMap.get(memberId);

          this.debug(`Processing member: ${member.user.tag}, Hierarchy: ${currentHierarchy}`);

          if (!existingEntry || currentHierarchy > existingEntry.hierarchy) {
            memberRoleMap.set(memberId, {
              hierarchy: currentHierarchy,
              name: roleName,
              member: member
            });
          }
        }
      } catch (error) {
        this.error(`Error fetching role ${roleName}: ${error.message}`);
      }
    }

    for (const [memberId, roleInfo] of memberRoleMap) {
      try {

        const member = await guild.members.fetch(memberId).catch(() => roleInfo.member);

        this.staffList.set(memberId, {
          hierarchy: roleInfo.hierarchy,
          name: roleInfo.name,
          mention: `<@${member.user.id}>`,
          status: member.presence?.status || 'offline',
          joinDate: member.joinedAt
        });
        this.debug(`Added staff member: ${member.user.tag} as ${roleInfo.name}`);
      } catch (error) {

        this.staffList.set(memberId, {
          hierarchy: roleInfo.hierarchy,
          name: roleInfo.name,
          mention: `<@${memberId}>`,
          status: roleInfo.member?.presence?.status || 'offline',
          joinDate: roleInfo.member?.joinedAt
        });
      }
    }

    this.debug(`Final staff list size: ${this.staffList.size}`);
  }


  generateStaffList(guild) {
    this.debug('Generating staff list from cache...');
    this.staffList.clear();

    this.debug(`Role names map size: ${this.roleNames.size}`);
    this.debug(`Role hierarchy map size: ${this.roleHierarchy.size}`);

    for (const [roleId, roleName] of this.roleNames.entries()) {
      this.debug(`Processing role: ${roleName} (ID: ${roleId})`);
      const role = guild.roles.cache.get(roleId);

      if (role) {
        this.debug(`Role found: ${role.name}, Members: ${role.members.size}`);
        role.members.forEach(member => {
          const existingEntry = this.staffList.get(member.id);
          const currentHierarchy = this.roleHierarchy.get(roleId);

          this.debug(`Processing member: ${member.user.tag}, Hierarchy: ${currentHierarchy}`);

          if (!existingEntry || currentHierarchy > existingEntry.hierarchy) {
            this.staffList.set(member.id, {
              hierarchy: currentHierarchy,
              name: roleName,
              mention: `<@${member.user.id}>`,
              status: member.presence?.status || 'offline',
              joinDate: member.joinedAt
            });
            this.debug(`Added/updated staff member: ${member.user.tag} as ${roleName}`);
          }
        });
      } else {
        this.debug(`Role not found in guild: ${roleId}`);
      }
    }

    this.debug(`Final staff list size: ${this.staffList.size}`);
  }


  getStatusPriority(status) {
    return this.config.statusOrder.indexOf(status);
  }


  createStaffListEmbed() {

    this.debug(`Creating staff list embed...`);
    this.debug(`lang.staffList.title: ${JSON.stringify(this.lang.staffList?.title)}`);
    this.debug(`config.serverName: ${JSON.stringify(this.config.serverName)}`);

    const titleTemplate = this.lang.staffList?.title;
    const serverName = this.config.serverName;

    if (!titleTemplate) {
      this.error('staffList.title is missing from language configuration');
      throw new Error('staffList.title is missing from language configuration');
    }

    if (!serverName) {
      this.error('serverName is missing from configuration');
      throw new Error('serverName is missing from configuration');
    }

    const finalTitle = titleTemplate.replace('{serverName}', serverName);
    this.debug(`Final title: ${JSON.stringify(finalTitle)}`);

    if (!finalTitle || finalTitle.trim() === '') {
      this.error('Final title is empty or invalid');
      throw new Error('Final title is empty or invalid');
    }

    const embed = new EmbedBuilder()
      .setTitle(finalTitle)
      .setColor(this.config.embed.color)
      .setTimestamp();

    if (this.config.embed.description?.length > 0) {
      const description = this.config.embed.description
        .join("\n")
        .replace('{serverName}', this.config.serverName);
      embed.setDescription(description);
    }

    if (this.config.embed.image?.trim()) {
      embed.setImage(this.config.embed.image);
    }

    if (this.config.embed.thumbnail?.trim()) {
      embed.setThumbnail(this.config.embed.thumbnail);
    }

    if (this.config.embed.footerText?.trim()) {
      const footerText = this.config.embed.footerText.replace('{serverName}', this.config.serverName);
      const footerOptions = { text: footerText };
      if (this.config.embed.footerImage?.trim()) {
        footerOptions.iconURL = this.config.embed.footerImage;
      }
      embed.setFooter(footerOptions);
    }

    const rolesByHierarchy = Array.from(this.roleNames.entries())
      .sort(([,], [,]) => 0)
      .sort(([aId], [bId]) => this.roleHierarchy.get(bId) - this.roleHierarchy.get(aId));

    for (const [roleId, roleName] of rolesByHierarchy) {
      const members = Array.from(this.staffList.values())
        .filter(staff => staff.name === roleName)
        .sort((a, b) => {
          const statusDiff = this.getStatusPriority(a.status) - this.getStatusPriority(b.status);
          if (statusDiff !== 0) return statusDiff;
          return a.joinDate - b.joinDate;
        });

      const memberList = members
        .map(staff => {
          let memberInfo = staff.mention;
          if (this.config.features.showMembersStatus) {
            memberInfo += `: ${this.config.statusEmojis[staff.status]}`;
          }
          if (this.config.features.showJoinDate) {
            const format = this.config.timeFormats.joinDate[this.config.timeFormats.joinDate.default];
            memberInfo += ` (Joined: ${moment(staff.joinDate).format(format)})`;
          }
          return memberInfo;
        })
        .join('\n') || this.lang.staffList.noMembers;

      embed.addFields({ name: roleName, value: memberList });
    }

    if (this.config.features.showStaffCount) {
      const totalStaff = this.staffList.size;
      const plural = totalStaff !== 1 ? 's' : '';
      embed.addFields({
        name: this.lang.staffList.totalStaff,
        value: this.lang.staffList.memberCount
          .replace('{count}', totalStaff.toString())
          .replace('{plural}', plural)
      });
    }

    return embed;
  }


  queueStaffListUpdate(guild) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(() => this.updateStaffList(guild), this.config.cooldowns.staffListUpdate);
  }


  async updateStaffList(guild) {
    try {

      await this.fetchStaffMembers(guild);
      this.staffListEmbed = this.createStaffListEmbed();
      await this.sendOrUpdateStaffListMessage();

    } catch (error) {
      this.error(`Error updating staff list: ${error.message}`);
    }
  }


  async sendOrUpdateStaffListMessage() {
    try {
      const channel = await this.client.channels.fetch(this.config.staffListChannelId);
      if (!channel) {
        this.error(`Staff list channel not found: ${this.config.staffListChannelId}`);
        return;
      }

      let savedMessage = await prisma.staffListMessage.findFirst({
        where: {
          guildId: this.client.guilds.cache.first()?.id,
          channelId: this.config.staffListChannelId
        }
      });

      if (savedMessage && savedMessage.messageId) {
        try {
          const message = await channel.messages.fetch(savedMessage.messageId);
          await message.edit({ embeds: [this.staffListEmbed] });
          this.debug('Staff list message updated successfully');
          return;
        } catch (error) {
          this.debug(`Could not fetch/update message ${savedMessage.messageId}: ${error.message}`);
        }
      }

      const sentMessage = await channel.send({ embeds: [this.staffListEmbed] });

      if (!savedMessage) {
        await prisma.staffListMessage.create({
          data: {
            guildId: this.client.guilds.cache.first()?.id,
            messageId: sentMessage.id,
            channelId: this.config.staffListChannelId
          }
        });
      } else {
        await prisma.staffListMessage.update({
          where: { id: savedMessage.id },
          data: { messageId: sentMessage.id }
        });
      }
      this.debug('Staff list message sent and saved');

    } catch (error) {
      this.error(`Error sending/updating staff list message: ${error.message}`);
    }
  }


  async handleConfirmation(interaction) {
    const { customId } = interaction;
    const [, action, confirmationId] = customId.split('_');
    const confirmation = this.pendingConfirmations.get(confirmationId);

    if (!confirmation) {
      return await interaction.reply({
        content: 'This confirmation request has expired.',
        ephemeral: true
      });
    }

    if (interaction.user.id !== confirmation.moderator.id) {
      return await interaction.reply({
        content: 'You cannot confirm/cancel another person\'s action.',
        ephemeral: true
      });
    }

    if (action === 'cancel' || customId.includes('cancel')) {
      this.pendingConfirmations.delete(confirmationId);
      return await interaction.reply({
        content: 'Action cancelled.',
        ephemeral: true
      });
    }

    if (action !== 'confirm' && !customId.includes('confirm')) {
      return;
    }

    try {
      if (confirmation.type === 'promotion') {
        await this.executePromotion(interaction, confirmation.targetUser, confirmation.currentRole, confirmation.newRoleId, confirmation.reason, confirmation.isFirstTime);
      } else if (confirmation.type === 'demotion') {
        await this.executeDemotion(interaction, confirmation.targetUser, confirmation.currentRole, confirmation.newRoleId, confirmation.reason);
      } else if (confirmation.type === 'removal') {
        await this.executeRemoval(interaction, confirmation.targetUser, confirmation.currentRole, confirmation.reason);
      }

      this.pendingConfirmations.delete(confirmationId);
    } catch (error) {
      this.error(`Error handling confirmation: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while processing your action.',
        ephemeral: true
      });
    }
  }


  async strikeUser(interaction, targetUser, reason, duration = null, silent = false) {
    try {
      if (!this.hasPermission(interaction.member, 'canStrike')) {
        return await interaction.reply({
          content: this.lang.commands.noPermission,
          ephemeral: true
        });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      const strikeId = this.generateStrikeId();
      let expiresAt = null;
      if (duration) {
        const durationMs = this.parseDuration(duration);
        if (durationMs) {
          expiresAt = new Date(Date.now() + durationMs);
        }
      }

      const strike = await prisma.staffStrike.create({
        data: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          username: targetUser.username,
          reason,
          issuedBy: interaction.user.id,
          issuedByUsername: interaction.user.username,
          strikeId,
          expiresAt,
          silent
        }
      });

      const now = new Date();
      const strikeCount = await prisma.staffStrike.findMany({
        where: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      });
      const maxStrikes = this.config.strikes.maxStrikes;

      await this.logStrike(strike, interaction.user, 'add');

      let responseMessage = `✅ ${targetUser.toString()} has been issued strike **#${strikeId}**. (${strikeCount.length}/${maxStrikes})`;

      if (strikeCount.length >= maxStrikes && this.config.strikes.autoDemoteOnMaxStrikes) {
        await this.demoteUser(interaction, targetUser, null, `Auto-demoted: Reached maximum strikes (${maxStrikes})`);
        responseMessage += `\n⚠️ User has reached maximum strikes and has been automatically demoted.`;
      }

      if (!silent) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Strike issued')
            .setDescription(`You have received a strike in ${interaction.guild.name}`)
            .setColor(this.config.embedColors.strike)
            .addFields(
              { name: 'Reason', value: `\`\`\`${reason}\`\`\``, inline: false },
              { name: 'Strike ID', value: strikeId, inline: true },
              { name: 'Your Strikes', value: `${strikeCount.length}/${maxStrikes}`, inline: true }
            )
            .setTimestamp();

          await targetMember.send({ embeds: [dmEmbed] });
        } catch (error) {
          this.debug(`Could not send DM to ${targetUser.tag}: ${error.message}`);
        }
      }

      return await interaction.reply({
        content: responseMessage,
        ephemeral: true
      });

    } catch (error) {
      this.error(`Error striking user: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while issuing the strike.',
        ephemeral: true
      });
    }
  }


  async removeStrike(interaction, strikeId) {
    try {
      if (!this.hasPermission(interaction.member, 'canStrike')) {
        return await interaction.reply({
          content: this.lang.commands.noPermission,
          ephemeral: true
        });
      }

      const strike = await prisma.staffStrike.findFirst({
        where: { strikeId }
      });

      if (!strike) {
        return await interaction.reply({
          content: `Strike **${strikeId}** not found.`,
          ephemeral: true
        });
      }

      const targetUserId = strike.userId;
      const targetUser = await this.client.users.fetch(targetUserId);

      await prisma.staffStrike.delete({
        where: { id: strike.id }
      });

      await this.logStrike(strike, interaction.user, 'remove');

      return await interaction.reply({
        content: `✅ Strike **${strikeId}** has been removed from ${targetUser.toString()}.`,
        ephemeral: true
      });

    } catch (error) {
      this.error(`Error removing strike: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while removing the strike.',
        ephemeral: true
      });
    }
  }


  async viewStrikes(interaction, targetUser) {
    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const { strikes } = await this.getStaffHistory(targetUser.id);

      if (strikes.length === 0) {
        return await interaction.reply({
          content: `${targetUser.toString()} has no active strikes.`,
          ephemeral: true
        });
      }

      const strikeList = strikes
        .map((strike, index) => `**${index + 1}.** \`${strike.strikeId}\` - ${strike.reason} (${moment(strike.issuedAt).fromNow()})`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`Strikes for ${targetUser.username}`)
        .setDescription(strikeList || 'No strikes')
        .setColor(this.config.embedColors.strike)
        .setTimestamp();

      return await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      this.error(`Error viewing strikes: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while fetching strikes.',
        ephemeral: true
      });
    }
  }
    
  async cleanupExpiredStrikes() {
    try {
      const result = await prisma.staffStrike.updateMany({
        where: {
          expiresAt: { not: null, lte: new Date() },
          isActive: true
        },
        data: {
          isActive: false,
          removedAt: new Date()
        }
      });

      if (result.count >= 0) {
        this.debug(`Cleaned up ${result.count} expired strikes`);
      }
    } catch (error) {
      this.error(`Error cleaning up expired strikes: ${error.message}`);
    }
  }

  async viewHistory(interaction, targetUser) {
    try {
      const { history, strikes } = await this.getStaffHistory(targetUser.id);

      if (history.length === 0 && strikes.length === 0) {
        return await interaction.reply({
          content: `No history found for ${targetUser.toString()}.`,
          ephemeral: true
        });
      }

      const historyList = history
        .slice(0, 10)
        .map(entry => `**${entry.type.toUpperCase()}** - ${entry.fromRole || 'None'} → ${entry.toRole || 'None'} (${moment(entry.timestamp).fromNow()})`)
        .join('\n') || 'No history';

      const strikeList = strikes
        .slice(0, 5)
        .map(strike => `\`${strike.strikeId}\` - ${strike.reason}`)
        .join('\n') || 'No active strikes';

      const embed = new EmbedBuilder()
        .setTitle(`Staff History for ${targetUser.username}`)
        .addFields(
          { name: 'Recent Actions', value: historyList || 'None', inline: false },
          { name: 'Active Strikes', value: strikeList || 'None', inline: false }
        )
        .setColor(this.config.embedColors.log)
        .setTimestamp();

      return await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      this.error(`Error viewing history: ${error.message}`);
      await interaction.reply({
        content: 'An error occurred while fetching history.',
        ephemeral: true
      });
    }
  }
}

module.exports = StaffManagement;