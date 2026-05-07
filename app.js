(function () {
    'use strict';

    var DATA_URL = 'data/data.json';
    var SETTINGS_URL = 'data/settings.json';
    var ALL_THEMES = ['light', 'dark', 'retro'];

    function calculateYearsForSkill(skillName, experience) {
        var years = 0;
        var index;
        var item;
        var startYear;
        var endYear;
        var itemYears;

        for (index = 0; index < experience.length; index += 1) {
            item = experience[index];
            if (!item.skills || item.skills.indexOf(skillName) === -1) {
                continue;
            }

            startYear = parseInt(item.startDate.substring(0, 4), 10) || 0;
            if (item.endDate === 'Present') {
                endYear = new Date().getFullYear();
            } else {
                endYear = parseInt(item.endDate.substring(0, 4), 10) || startYear;
            }
            itemYears = endYear - startYear;
            if (itemYears > 0) {
                years += itemYears;
            }
        }

        return years;
    }

    function buildSkillsFromExperience(experience) {
        var skillSet = {};
        var skills = [];
        var index;
        var skillIndex;
        var skillName;
        var item;

        for (index = 0; index < experience.length; index += 1) {
            item = experience[index];
            if (item.skills && Array.isArray(item.skills)) {
                for (skillIndex = 0; skillIndex < item.skills.length; skillIndex += 1) {
                    skillName = item.skills[skillIndex];
                    if (!skillSet[skillName]) {
                        skillSet[skillName] = true;
                    }
                }
            }
        }

        for (skillName in skillSet) {
            if (skillSet.hasOwnProperty(skillName)) {
                skills.push({
                    name: skillName,
                    years: calculateYearsForSkill(skillName, experience)
                });
            }
        }

        skills.sort(function (a, b) {
            return (b.years || 0) - (a.years || 0);
        });

        return skills;
    }
    var PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22360%22 height=%22360%22 viewBox=%220 0 360 360%22%3E%3Cdefs%3E%3ClinearGradient id=%22bg%22 x1=%220%22 x2=%221%22 y1=%220%22 y2=%221%22%3E%3Cstop offset=%220%25%22 stop-color=%22%23dce5ea%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%23b9c9d4%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22360%22 height=%22360%22 rx=%2236%22 fill=%22url(%23bg)%22/%3E%3Ccircle cx=%22180%22 cy=%22132%22 r=%2262%22 fill=%22%238aa1b1%22/%3E%3Cpath d=%22M88 294c18-48 53-74 92-74s74 26 92 74%22 fill=%22%238aa1b1%22/%3E%3C/svg%3E';
    var PLACEHOLDER_IMAGE_RETRO = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22360%22 height=%22360%22 viewBox=%220 0 360 360%22%3E%3Crect width=%22360%22 height=%22360%22 rx=%220%22 fill=%22%23000055%22/%3E%3Ccircle cx=%22180%22 cy=%22132%22 r=%2262%22 fill=%22%23aaaaaa%22/%3E%3Cpath d=%22M88 294c18-48 53-74 92-74s74 26 92 74%22 fill=%22%23aaaaaa%22/%3E%3C/svg%3E';
    var state = {
        activeSkillName: null,
        activeExperienceId: null,
        data: null
    };
    var connectorRefreshTimer = null;

    var elements = {
        main: document.getElementById('main-content'),
        photo: document.getElementById('profile-photo'),
        name: document.getElementById('profile-name'),
        headline: document.getElementById('profile-headline'),
        summary: document.getElementById('profile-summary'),
        skillsPanel: document.getElementById('skills-panel'),
        experiencePanel: document.getElementById('experience-panel'),
        contactList: document.getElementById('contact-list'),
        skillsList: document.getElementById('skills-list'),
        experienceList: document.getElementById('experience-list'),
        educationList: document.getElementById('education-list'),
        contactCard: document.getElementById('contact-card'),
        resetButton: document.getElementById('reset-filters'),
        connector: document.getElementById('selection-connector')
    };

    function clearConnectorSegments() {
        elements.connector.innerHTML = '';
    }

    function createConnectorSegment(left, top, width, height) {
        var segment;

        if (width <= 0 && height <= 0) {
            return;
        }

        segment = document.createElement('span');
        segment.className = 'selection-connector__segment';
        segment.style.left = Math.round(left) + 'px';
        segment.style.top = Math.round(top) + 'px';
        segment.style.width = Math.max(0, Math.round(width)) + 'px';
        segment.style.height = Math.max(0, Math.round(height)) + 'px';
        segment.style.opacity = '1';
        elements.connector.appendChild(segment);
    }

    function hideConnector() {
        elements.connector.className = 'selection-connector is-hidden';
        clearConnectorSegments();
    }

    function updateConnector() {
        var hasSelection = state.activeSkillName || state.activeExperienceId;
        var sourceNode;
        var targetNodes;
        var mainRect;
        var skillsPanelRect;
        var sourceRect;
        var thickness = 3;
        var outsideOffset = 14;
        var sourceX;
        var sourceY;
        var exitX;
        var sourceXInside;
        var sourceYInside;
        var exitXInside;
        var targetInfo = [];
        var targetIndex;
        var targetRect;
        var targetXInside;
        var targetYInside;
        var topY;
        var bottomY;
        var hOutLeft;
        var hOutWidth;

        if (!hasSelection) {
            hideConnector();
            return;
        }

        sourceNode = elements.skillsList.querySelector('.skill-pill.is-active, .skill-pill.is-related');
        targetNodes = elements.experienceList.querySelectorAll('.experience-card.is-active, .experience-card.is-related');

        if (!sourceNode || !targetNodes.length || !elements.main || !elements.skillsPanel) {
            hideConnector();
            return;
        }

        mainRect = elements.main.getBoundingClientRect();
        skillsPanelRect = elements.skillsPanel.getBoundingClientRect();
        sourceRect = sourceNode.getBoundingClientRect();

        sourceX = sourceRect.left;
        sourceY = sourceRect.top + (sourceRect.height / 2);
        exitX = skillsPanelRect.left - outsideOffset;

        if (exitX > sourceX - 8) {
            exitX = sourceX - 8;
        }

        sourceXInside = sourceX - mainRect.left;
        sourceYInside = sourceY - mainRect.top;
        exitXInside = exitX - mainRect.left;

        for (targetIndex = 0; targetIndex < targetNodes.length; targetIndex += 1) {
            targetRect = targetNodes[targetIndex].getBoundingClientRect();
            var companyNode = targetNodes[targetIndex].querySelector('.experience-card__company');
            var companyRect = companyNode ? companyNode.getBoundingClientRect() : null;
            targetXInside = targetRect.left - mainRect.left;
            targetYInside = companyRect
                ? (companyRect.top + (companyRect.height / 2)) - mainRect.top
                : (targetRect.top + (targetRect.height / 2)) - mainRect.top;

            targetInfo.push({
                x: targetXInside,
                y: targetYInside
            });
        }

        targetInfo.sort(function (left, right) {
            return left.y - right.y;
        });

        topY = Math.min(sourceYInside, targetInfo[0].y);
        bottomY = Math.max(sourceYInside, targetInfo[targetInfo.length - 1].y);

        clearConnectorSegments();

        hOutLeft = Math.min(sourceXInside, exitXInside);
        hOutWidth = Math.abs(sourceXInside - exitXInside);
        createConnectorSegment(hOutLeft, sourceYInside - (thickness / 2), hOutWidth, thickness);

        createConnectorSegment(exitXInside - (thickness / 2), topY, thickness, Math.abs(bottomY - topY));

        for (targetIndex = 0; targetIndex < targetInfo.length; targetIndex += 1) {
            createConnectorSegment(
                Math.min(exitXInside, targetInfo[targetIndex].x),
                targetInfo[targetIndex].y - (thickness / 2),
                Math.abs(targetInfo[targetIndex].x - exitXInside),
                thickness
            );
        }

        elements.connector.className = 'selection-connector is-visible';
    }

    function scheduleConnectorRefresh() {
        if (connectorRefreshTimer !== null) {
            clearTimeout(connectorRefreshTimer);
            connectorRefreshTimer = null;
        }

        // Keep the connector hidden while items are animating into their new positions.
        hideConnector();

        connectorRefreshTimer = setTimeout(function () {
            updateConnector();
            connectorRefreshTimer = null;
        }, 320);
    }

    function getRects(container, selector, attributeName) {
        var nodes = container.querySelectorAll(selector);
        var rects = {};
        var index;
        var key;
        for (index = 0; index < nodes.length; index += 1) {
            key = nodes[index].getAttribute(attributeName);
            if (key) {
                rects[key] = nodes[index].getBoundingClientRect();
            }
        }
        return rects;
    }

    function animateReorder(container, selector, attributeName, firstRects) {
        var nodes = container.querySelectorAll(selector);
        var index;
        var node;
        var key;
        var lastRect;
        var firstRect;
        var deltaX;
        var deltaY;

        for (index = 0; index < nodes.length; index += 1) {
            node = nodes[index];
            key = node.getAttribute(attributeName);
            firstRect = firstRects[key];
            if (!firstRect) {
                continue;
            }

            lastRect = node.getBoundingClientRect();
            deltaX = firstRect.left - lastRect.left;
            deltaY = firstRect.top - lastRect.top;

            if (!deltaX && !deltaY) {
                continue;
            }

            node.style.transition = 'none';
            node.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
            node.offsetHeight;
            node.style.transition = 'transform 260ms ease, opacity 220ms ease, background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease';
            node.style.transform = '';
        }
    }

    function requestJson(url, onSuccess, onError) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.onreadystatechange = function () {
            if (request.readyState !== 4) {
                return;
            }

            if (request.status >= 200 && request.status < 300 || request.status === 0 && request.responseText) {
                try {
                    onSuccess(JSON.parse(request.responseText));
                } catch (error) {
                    onError(error);
                }
                return;
            }

            onError(new Error('Request failed with status ' + request.status));
        };
        request.send();
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sortExperience(items) {
        return items.slice().sort(function (left, right) {
            var rightDate = Date.parse(right.startDate || '') || 0;
            var leftDate = Date.parse(left.startDate || '') || 0;
            return rightDate - leftDate;
        });
    }

    function normalizeData(data) {
        var normalized = data || {};
        normalized.profile = normalized.profile || {};
        normalized.contact = normalized.contact || [];
        normalized.experience = sortExperience(normalized.experience || []);
        normalized.skills = buildSkillsFromExperience(normalized.experience);
        normalized.education = normalized.education || [];
        return normalized;
    }

    function getActiveSkillNames() {
        var skills = [];
        var activeExperience;
        var skillIndex;

        if (state.activeSkillName) {
            skills.push(state.activeSkillName);
        }

        if (state.activeExperienceId) {
            activeExperience = findExperienceById(state.activeExperienceId);
            if (activeExperience && activeExperience.skills) {
                for (skillIndex = 0; skillIndex < activeExperience.skills.length; skillIndex += 1) {
                    if (skills.indexOf(activeExperience.skills[skillIndex]) === -1) {
                        skills.push(activeExperience.skills[skillIndex]);
                    }
                }
            }
        }

        return skills;
    }

    function findExperienceById(experienceId) {
        var experience = state.data && state.data.experience ? state.data.experience : [];
        var index;
        for (index = 0; index < experience.length; index += 1) {
            if (experience[index].id === experienceId) {
                return experience[index];
            }
        }
        return null;
    }

    function getOrderedExperience() {
        var items = state.data.experience.slice();
        var matching = [];
        var other = [];
        var index;

        if (!state.activeSkillName) {
            return items;
        }

        for (index = 0; index < items.length; index += 1) {
            if (belongsToActiveSkill(items[index])) {
                matching.push(items[index]);
            } else {
                other.push(items[index]);
            }
        }

        return matching.concat(other);
    }

    function getOrderedSkills() {
        var items = state.data.skills.slice();
        var activeSkillNames = getActiveSkillNames();
        var matching = [];
        var other = [];
        var index;

        items.sort(function (left, right) {
            return (right.years || 0) - (left.years || 0);
        });

        if (!activeSkillNames.length) {
            return items;
        }

        for (index = 0; index < items.length; index += 1) {
            if (activeSkillNames.indexOf(items[index].name) !== -1) {
                matching.push(items[index]);
            } else {
                other.push(items[index]);
            }
        }

        return matching.concat(other);
    }

    function skillTier(skill) {
        var amount = skill.years || skill.weight || 0;
        if (amount >= 9) {
            return 4;
        }
        if (amount >= 6) {
            return 3;
        }
        if (amount >= 3) {
            return 2;
        }
        return 1;
    }

    function getCurrentTheme() {
        var themeLink = document.getElementById('theme-link');
        var href = themeLink && themeLink.getAttribute('href') ? themeLink.getAttribute('href') : '';

        if (href.indexOf('retro.css') !== -1) {
            return 'retro';
        }

        if (href.indexOf('dark.css') !== -1) {
            return 'dark';
        }

        return 'light';
    }

    function getProfilePhotoUrl(profile) {
        var theme = getCurrentTheme();
        var themedPhotos = profile && profile.photoByTheme ? profile.photoByTheme : null;

        if (themedPhotos && themedPhotos[theme]) {
            return themedPhotos[theme];
        }

        if (profile && profile.photo) {
            return profile.photo;
        }

        return theme === 'retro' ? PLACEHOLDER_IMAGE_RETRO : PLACEHOLDER_IMAGE;
    }

    function renderProfile() {
        var profile = state.data.profile;
        var profileName = profile.name || 'Your Name';
        var contactMarkup = [];
        var contactIndex;
        var contactItem;

        elements.photo.src = getProfilePhotoUrl(profile);
        elements.photo.alt = profile.photoAlt || 'Portrait placeholder';
        elements.name.innerHTML = escapeHtml(profileName);
        elements.headline.innerHTML = escapeHtml(profile.headline || 'Professional headline');
        elements.summary.innerHTML = escapeHtml(profile.summary || 'Add a concise professional summary in data.json.');
        document.title = profileName;
        document.getElementById('copyright-year').textContent = new Date().getFullYear();

        for (contactIndex = 0; contactIndex < state.data.contact.length; contactIndex += 1) {
            contactItem = state.data.contact[contactIndex];

            if (String(contactItem.label || '').toLowerCase() === 'location') {
                contactMarkup.push('<li>' + escapeHtml(contactItem.value) + '</li>');
            }
        }

        elements.contactList.innerHTML = contactMarkup.join('');
    }

    function renderSkills() {
        var skills = getOrderedSkills();
        var activeSkillNames = getActiveSkillNames();
        var markup = [];
        var index;
        var skill;
        var tier;
        var classNames;

        for (index = 0; index < skills.length; index += 1) {
            skill = skills[index];
            tier = skillTier(skill);
            classNames = ['skill-pill', 'skill-pill--tier-' + tier];

            if (state.activeSkillName === skill.name) {
                classNames.push('is-active');
            } else if (activeSkillNames.indexOf(skill.name) !== -1) {
                classNames.push('is-related');
            }

            if (activeSkillNames.length && activeSkillNames.indexOf(skill.name) === -1) {
                classNames.push('is-dimmed');
            }

            markup.push(
                '<button class="' + classNames.join(' ') + '" type="button" data-skill-name="' + escapeHtml(skill.name) + '" data-animate-key="skill-' + escapeHtml(skill.name) + '" aria-pressed="' + (state.activeSkillName === skill.name ? 'true' : 'false') + '">' +
                    '<span class="skill-pill__name">' + escapeHtml(skill.name) + '</span>' +
                    '<span class="skill-pill__meta">' + escapeHtml(String(skill.years || 0)) + ' yrs</span>' +
                '</button>'
            );
        }

        if (!markup.length) {
            markup.push('<p class="empty-state">Add experience with skills to data.json to populate this section.</p>');
        }

        elements.skillsList.innerHTML = markup.join('');
    }

    function belongsToActiveSkill(experienceItem) {
        var skillIndex;
        if (!state.activeSkillName) {
            return false;
        }
        if (!experienceItem.skills) {
            return false;
        }
        for (skillIndex = 0; skillIndex < experienceItem.skills.length; skillIndex += 1) {
            if (experienceItem.skills[skillIndex] === state.activeSkillName) {
                return true;
            }
        }
        return false;
    }

    function renderExperience() {
        var items = getOrderedExperience();
        var markup = [];
        var index;
        var item;
        var classNames;
        var skillMarkup;
        var achievementMarkup;
        var skillIndex;
        var achievementIndex;
        var isRelatedToSkill;

        for (index = 0; index < items.length; index += 1) {
            item = items[index];
            classNames = ['experience-card'];
            isRelatedToSkill = belongsToActiveSkill(item);
            skillMarkup = [];
            achievementMarkup = [];

            if (state.activeExperienceId === item.id) {
                classNames.push('is-active');
            } else if (isRelatedToSkill) {
                classNames.push('is-related');
            }

            if ((state.activeSkillName && !isRelatedToSkill) || (state.activeExperienceId && state.activeExperienceId !== item.id)) {
                if (!isRelatedToSkill) {
                    classNames.push('is-dimmed');
                }
            }

            for (skillIndex = 0; skillIndex < (item.skills || []).length; skillIndex += 1) {
                skillMarkup.push('<span class="mini-pill">' + escapeHtml(item.skills[skillIndex]) + '</span>');
            }

            for (achievementIndex = 0; achievementIndex < (item.achievements || []).length; achievementIndex += 1) {
                achievementMarkup.push('<li>' + escapeHtml(item.achievements[achievementIndex]) + '</li>');
            }

            markup.push(
                '<article class="' + classNames.join(' ') + '" data-experience-id="' + escapeHtml(item.id) + '" data-animate-key="experience-' + escapeHtml(item.id) + '" tabindex="0" role="button" aria-pressed="' + (state.activeExperienceId === item.id ? 'true' : 'false') + '">' +
                    '<div class="experience-card__topline">' +
                        '<div>' +
                            '<h3 class="experience-card__title">' +
                                '<span class="experience-card__company">' + escapeHtml(item.company) + '</span>' +
                                (item.location ? '<span class="experience-card__separator experience-card__separator--comma">,</span><span class="experience-card__location">' + escapeHtml(item.location) + '</span>' : '') +
                                '<span class="experience-card__separator experience-card__separator--dash">-</span>' +
                                '<span class="experience-card__role">' + escapeHtml(item.title) + '</span>' +
                            '</h3>' +
                        '</div>' +
                        '<p class="experience-card__meta">' + escapeHtml(item.startDateLabel || item.startDate || '') + ' - ' + escapeHtml(item.endDateLabel || item.endDate || 'Present') + '</p>' +
                    '</div>' +
                    '<p class="experience-card__description">' + escapeHtml(item.summary || '') + '</p>' +
                    (achievementMarkup.length ? '<ul class="experience-card__achievements">' + achievementMarkup.join('') + '</ul>' : '') +
                    (skillMarkup.length ? '<div class="experience-card__skills">' + skillMarkup.join('') + '</div>' : '') +
                '</article>'
            );
        }

        if (!markup.length) {
            markup.push('<p class="empty-state">Add experience entries to data.json to populate this section.</p>');
        }

        elements.experienceList.innerHTML = markup.join('');
    }

    function renderEducation() {
        var markup = [];
        var index;
        var item;

        for (index = 0; index < state.data.education.length; index += 1) {
            item = state.data.education[index];
            markup.push(
                '<article class="education-card">' +
                    '<div class="education-card__topline">' +
                        '<h3 class="education-card__title">' + escapeHtml(item.degree) + '</h3>' +
                        '<p class="education-card__meta">' + escapeHtml(item.startYear || '') + ' - ' + escapeHtml(item.endYear || '') + '</p>' +
                    '</div>' +
                    '<p class="education-card__meta">' + escapeHtml(item.school) + '</p>' +
                    '<p class="education-card__meta">' + escapeHtml(item.details || '') + '</p>' +
                '</article>'
            );
        }

        if (!markup.length) {
            markup.push('<p class="empty-state">Add education details to data.json to populate this section.</p>');
        }

        elements.educationList.innerHTML = markup.join('');
    }

    function renderContactCard() {
        var markup = [];
        var index;
        var item;

        for (index = 0; index < state.data.contact.length; index += 1) {
            item = state.data.contact[index];
            markup.push(
                '<article class="contact-card">' +
                    '<h3 class="contact-card__label">' + escapeHtml(item.label) + '</h3>' +
                    '<p class="contact-card__value">' + escapeHtml(item.value) + '</p>' +
                '</article>'
            );
        }

        if (!markup.length) {
            markup.push('<p class="empty-state">Add contact details to data.json to populate this section.</p>');
        }

        elements.contactCard.innerHTML = markup.join('');
    }

    function render() {
        var skillRects = getRects(elements.skillsList, '[data-animate-key]', 'data-animate-key');
        var experienceRects = getRects(elements.experienceList, '[data-animate-key]', 'data-animate-key');

        renderProfile();
        renderSkills();
        renderExperience();
        renderEducation();
        renderContactCard();
        elements.resetButton.className = state.activeSkillName || state.activeExperienceId ? 'ghost-button' : 'ghost-button is-hidden';
        animateReorder(elements.skillsList, '[data-animate-key]', 'data-animate-key', skillRects);
        animateReorder(elements.experienceList, '[data-animate-key]', 'data-animate-key', experienceRects);
        scheduleConnectorRefresh();
    }

    function resetSelection() {
        state.activeSkillName = null;
        state.activeExperienceId = null;
        render();
    }

    function onSkillSelect(skillName) {
        state.activeExperienceId = null;
        state.activeSkillName = state.activeSkillName === skillName ? null : skillName;
        render();
    }

    function onExperienceSelect(experienceId) {
        state.activeSkillName = null;
        state.activeExperienceId = state.activeExperienceId === experienceId ? null : experienceId;
        render();
    }

    function closestByAttribute(startNode, attributeName) {
        var node = startNode;
        while (node && node !== document.body) {
            if (node.getAttribute && node.getAttribute(attributeName)) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    function bindEvents() {
        elements.skillsList.onclick = function (event) {
            var target = closestByAttribute(event.target, 'data-skill-name');
            if (target) {
                onSkillSelect(target.getAttribute('data-skill-name'));
            }
        };

        elements.experienceList.onclick = function (event) {
            var target = closestByAttribute(event.target, 'data-experience-id');
            if (target) {
                onExperienceSelect(target.getAttribute('data-experience-id'));
            }
        };

        elements.experienceList.onkeydown = function (event) {
            var key = event.key || event.keyCode;
            var target = closestByAttribute(event.target, 'data-experience-id');
            if (!target) {
                return;
            }

            if (key === 'Enter' || key === ' ' || key === 13 || key === 32) {
                if (event.preventDefault) {
                    event.preventDefault();
                }
                onExperienceSelect(target.getAttribute('data-experience-id'));
            }
        };

        elements.resetButton.onclick = function () {
            resetSelection();
        };

        if (window.addEventListener) {
            window.addEventListener('resize', updateConnector);
            window.addEventListener('orientationchange', updateConnector);
        } else if (window.attachEvent) {
            window.attachEvent('onresize', updateConnector);
        }
    }

    function showErrorState() {
        var template = document.getElementById('error-template');
        document.body.innerHTML = template.innerHTML;
    }

    function initTheme(settings) {
        var themeLink = document.getElementById('theme-link');
        var pickerNav = document.getElementById('theme-picker');
        var availableThemes;
        var defaultTheme;
        var savedTheme;
        var activeTheme;
        var themeLinks;
        var index;
        var label;

        if (!themeLink) {
            return;
        }

        availableThemes = (settings && Array.isArray(settings['available-themes']))
            ? settings['available-themes'].filter(function (t) { return ALL_THEMES.indexOf(t) !== -1; })
            : ALL_THEMES.slice();

        if (!availableThemes.length) {
            availableThemes = ALL_THEMES.slice();
        }

        defaultTheme = (settings && settings['default-theme'] && availableThemes.indexOf(settings['default-theme']) !== -1)
            ? settings['default-theme']
            : availableThemes[0];

        // Build picker links dynamically
        if (pickerNav) {
            if (availableThemes.length <= 1) {
                pickerNav.style.display = 'none';
            } else {
                pickerNav.innerHTML = '';
                for (index = 0; index < availableThemes.length; index += 1) {
                    if (index > 0) {
                        var sep = document.createElement('span');
                        sep.className = 'theme-picker__separator';
                        sep.setAttribute('aria-hidden', 'true');
                        sep.textContent = '|';
                        pickerNav.appendChild(sep);
                    }
                    label = availableThemes[index].charAt(0).toUpperCase() + availableThemes[index].slice(1);
                    var link = document.createElement('a');
                    link.href = '#';
                    link.className = 'theme-picker__link';
                    link.setAttribute('data-theme', availableThemes[index]);
                    link.textContent = label;
                    pickerNav.appendChild(link);
                }
            }
        }

        themeLinks = document.querySelectorAll('.theme-picker__link[data-theme]');
        activeTheme = availableThemes[0];

        function applyTheme(theme) {
            var linkIndex;
            var linkTheme;

            function refreshConnectorForTheme() {
                if (state.data && (state.activeSkillName || state.activeExperienceId)) {
                    scheduleConnectorRefresh();
                }
            }

            themeLink.onload = function () {
                refreshConnectorForTheme();
            };

            themeLink.href = 'themes/' + theme + '.css';
            document.body.classList.remove('light-theme', 'dark-theme', 'retro-theme');
            document.body.classList.add(theme + '-theme');
            document.body.setAttribute('data-theme', theme);
            activeTheme = theme;

            for (linkIndex = 0; linkIndex < themeLinks.length; linkIndex += 1) {
                linkTheme = themeLinks[linkIndex].getAttribute('data-theme');
                if (linkTheme === theme) {
                    themeLinks[linkIndex].classList.add('is-active');
                    themeLinks[linkIndex].setAttribute('aria-current', 'page');
                } else {
                    themeLinks[linkIndex].classList.remove('is-active');
                    themeLinks[linkIndex].removeAttribute('aria-current');
                }
            }

            if (state.data) {
                renderProfile();
            }

            // Fallback in case stylesheet load event is not emitted by the browser/cache path.
            setTimeout(refreshConnectorForTheme, 60);
        }

        try {
            savedTheme = localStorage.getItem('theme');
        } catch (e) {
            savedTheme = null;
        }

        // Saved theme must be in available-themes, otherwise use default
        applyTheme(availableThemes.indexOf(savedTheme) !== -1 ? savedTheme : defaultTheme);

        for (index = 0; index < themeLinks.length; index += 1) {
            themeLinks[index].onclick = function (event) {
                var selectedTheme = this.getAttribute('data-theme');

                if (event && event.preventDefault) {
                    event.preventDefault();
                }

                if (availableThemes.indexOf(selectedTheme) === -1 || selectedTheme === activeTheme) {
                    return;
                }

                applyTheme(selectedTheme);
                try {
                    localStorage.setItem('theme', selectedTheme);
                } catch (e) {}
            };
        }
    }

    function init() {
        bindEvents();
        elements.resetButton.className = 'ghost-button is-hidden';

        requestJson(SETTINGS_URL, function (settings) {
            initTheme(settings);
            requestJson(DATA_URL, function (data) {
                state.data = normalizeData(data);
                render();
            }, function () {
                showErrorState();
            });
        }, function () {
            // settings.json missing or invalid — fall back to defaults
            initTheme(null);
            requestJson(DATA_URL, function (data) {
                state.data = normalizeData(data);
                render();
            }, function () {
                showErrorState();
            });
        });
    }

    init();
}());