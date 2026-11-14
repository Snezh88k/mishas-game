// Рисует страницу из window.GAME_DATA (data.js). Библиотек нет - открывается прямо из файла.

(function () {
	const data = window.GAME_DATA;
	const $ = (id) => document.getElementById(id);

	const TOWER_TYPES = {
		Attack: 'Атакующая',
		Money: 'Приносит деньги',
		Summon: 'Призыватель',
	};

	// Коэффициент 0.5 -> "×0.5", 1 -> "×1".
	const times = (n) => '×' + String(Math.round(n * 100) / 100);
	const number = (n) => (n == null ? '—' : n.toLocaleString('ru-RU'));
	const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

	function el(tag, className, html) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (html != null) node.innerHTML = html;
		return node;
	}

	function table(target, headers, rows) {
		const head = '<thead><tr>' + headers.map((h) => `<th${h.num ? ' class="num"' : ''}>${esc(h.text)}</th>`).join('') + '</tr></thead>';
		const body = '<tbody>' + rows.map((row) => {
			const cells = row.cells.map((cell, i) => `<td${headers[i].num ? ' class="num"' : ''}>${cell}</td>`).join('');
			return `<tr${row.soon ? ' class="soon"' : ''}>${cells}</tr>`;
		}).join('') + '</tbody>';
		target.innerHTML = head + body;
	}

	// --- Основы ---
	function renderFacts() {
		const facts = [
			[number(data.startCash), 'стартовые деньги в матче'],
			[number(data.baseHealth), 'здоровье базы'],
			[data.waitBetweenWaves + ' с', 'пауза между волнами'],
		];
		$('facts').replaceChildren(...facts.map(([value, label]) => el('div', 'fact', `<b>${esc(value)}</b><span>${esc(label)}</span>`)));
	}

	// --- Режимы ---
	function renderModes() {
		const normal = data.modes.find((m) => m.name === 'Normal');

		table($('modes-table'), [
			{ text: 'Режим' },
			{ text: 'Волн', num: true },
			{ text: 'Мобов', num: true },
			{ text: 'Боссы' },
			{ text: 'Здоровье мобов', num: true },
			{ text: 'Награда за победу', num: true },
			{ text: 'Попытки' },
		], data.modes.map((m) => {
			if (m.comingSoon) {
				return { soon: true, cells: [`<b>${esc(m.name)}</b>`, '—', '—', 'скоро', '—', '—', '—'] };
			}
			return {
				cells: [
					`<b>${esc(m.name)}</b>`,
					number(m.waves),
					number(m.mobs),
					[...new Set(m.bossNames)].map(esc).join(', '),
					times(m.healthMultiplier),
					number(m.finalReward),
					m.attemptsPerDay ? `${m.attemptsPerDay} игр в сутки` : 'без лимита',
				],
			};
		}));

		const cards = data.modes.map((m) => {
			if (m.comingSoon) {
				return el('div', 'card soon', `<h3>${esc(m.name)}<span class="badge">скоро</span></h3><p>Режим в разработке — волн ещё нет.</p>`);
			}
			const notes = [];
			if (m.name === 'Normal') {
				notes.push(`Основной режим: ${m.waves} волн и финальный босс.`);
			} else if (normal) {
				const diffWaves = m.waves - normal.waves;
				notes.push(diffWaves === 0 ? `${m.waves} волн, как в Normal.` : `${m.waves} волн — на ${Math.abs(diffWaves)} ${diffWaves < 0 ? 'короче' : 'длиннее'}, чем в Normal.`);
			}
			notes.push(m.healthMultiplier === 1
				? 'Здоровье мобов обычное.'
				: `Мобы ${m.healthMultiplier < 1 ? 'слабее' : 'живучее'}: ${times(m.healthMultiplier)} от обычного здоровья.`);
			notes.push(m.attemptsPerDay ? `Можно сыграть ${m.attemptsPerDay} раз за 24 часа.` : 'Играть можно без ограничения по попыткам.');
			notes.push(`Типы мобов: ${m.mobTypes.map(esc).join(', ')}.`);
			return el('div', 'card', `<h3>${esc(m.name)}</h3>${notes.map((n) => `<p>${n}</p>`).join('')}`);
		});
		$('modes-cards').replaceChildren(...cards);
	}

	// --- Карты ---
	function renderMaps() {
		const cards = data.complexities.map((c) => {
			const hasMaps = c.maps.length > 0;
			const body = hasMaps
				? c.maps.map((m) => `<p>🗺 ${esc(m)}</p>`).join('')
				: '<p>Карты скоро появятся.</p>';
			return el('div', 'card' + (hasMaps ? '' : ' soon'),
				`<h3>${esc(c.name)}<span class="badge gold">награда ×${Math.round(c.multiplier * 100) / 100}</span></h3>${body}`);
		});
		$('maps-cards').replaceChildren(...cards);
	}

	// --- Башни ---
	function shopText(tower) {
		if (typeof tower.shopPrice === 'string') {
			return /normal/i.test(tower.shopPrice) ? 'открывается за победу в Normal' : esc(tower.shopPrice);
		}
		return tower.shopPrice ? `${number(tower.shopPrice)} в магазине лобби` : '—';
	}

	function renderTower(tower) {
		const view = $('tower-view');
		const hasDamage = tower.levels.some((l) => l.damage != null);
		const headers = [{ text: 'Уровень' }, { text: 'Цена', num: true }];
		if (tower.type === 'Money') headers.push({ text: 'Доход раз в 2 с', num: true });
		if (tower.type === 'Summon') headers.push({ text: 'Саммон' }, { text: 'Урон саммона', num: true }, { text: 'Перезарядка, с', num: true });
		if (tower.type === 'Attack') headers.push({ text: 'Урон', num: true }, { text: 'Радиус', num: true }, { text: 'Перезарядка, с', num: true });
		if (tower.type !== 'Summon') {
			// у денежной башни радиус - зона установки
			if (tower.type === 'Money') headers.push({ text: 'Радиус', num: true });
		} else {
			headers.push({ text: 'Радиус', num: true });
		}

		const rows = tower.levels.map((l) => {
			const cells = [String(l.level), number(l.price)];
			if (tower.type === 'Money') cells.push(number(l.money));
			if (tower.type === 'Summon') cells.push(esc(l.summon || '—'), number(l.damage), number(l.cool));
			if (tower.type === 'Attack') cells.push(number(l.damage), number(l.range), number(l.cool));
			if (tower.type === 'Money' || tower.type === 'Summon') cells.push(number(l.range));
			return { cells };
		});

		const chips = [
			`Тип: ${TOWER_TYPES[tower.type] || esc(tower.type)}`,
			`Лимит в матче: ${number(tower.limit)}`,
			`Получить: ${shopText(tower)}`,
		];

		const head = el('div', 'tower-head', `<h3>${esc(tower.name)}${tower.soon ? '<span class="badge danger">скоро в магазине</span>' : ''}</h3>`);
		const chipRow = el('div', 'chips', chips.map((c) => `<span class="chip">${c}</span>`).join(''));
		const wrap = el('div', 'table-scroll');
		const t = el('table');
		wrap.appendChild(t);
		table(t, headers, rows);

		const notes = [];
		const last = tower.levels[tower.levels.length - 1];
		if (last && last.abilityDamage) {
			notes.push(`Способность на ${last.level} уровне: ${number(last.abilityDamage)} урона, перезарядка ${number(last.abilityReload)} с.`);
		}
		if (tower.type === 'Summon') {
			notes.push('Собственной атаки нет: по кнопке Summon в окне башен каждая башня по очереди вызывает саммона своего уровня. Саммон идёт по пути назад к спавну, проходит сквозь мобов и один раз бьёт каждого, до кого дотянулся. Перезарядка кнопки общая, новая башня её не сбрасывает.');
		}
		if (hasDamage && tower.type === 'Attack') {
			notes.push('Невидимых мобов видят башни от 2 уровня.');
		}

		view.replaceChildren(head, chipRow, wrap, ...notes.map((n) => el('p', 'muted', esc(n))));
	}

	function renderTowers() {
		const tabs = $('tower-tabs');
		const towers = data.towers;
		const buttons = towers.map((tower, index) => {
			const b = el('button', 'tab', esc(tower.name));
			b.type = 'button';
			b.setAttribute('role', 'tab');
			b.addEventListener('click', () => select(index));
			return b;
		});
		tabs.replaceChildren(...buttons);

		function select(index) {
			buttons.forEach((b, i) => b.setAttribute('aria-selected', String(i === index)));
			renderTower(towers[index]);
		}
		select(0);
	}

	// --- Мобы ---
	function renderMonsters() {
		const rows = data.monsters.map((m) => {
			const tags = [];
			if (m.boss) tags.push('<span class="badge danger">босс</span>');
			if (m.invisible) tags.push('<span class="badge">невидимый</span>');
			const minions = m.minions
				? m.minions.map((x) => `${x.amount} × ${esc(x.name)} каждые ${x.interval} с`).join(', ')
				: '';
			return {
				cells: [`<b>${esc(m.name)}</b> ${tags.join('')}`, number(m.health), number(m.speed), minions || '—'],
			};
		});
		table($('monsters-table'), [
			{ text: 'Моб' },
			{ text: 'Здоровье', num: true },
			{ text: 'Скорость', num: true },
			{ text: 'Приспешники' },
		], rows);
	}

	renderFacts();
	renderModes();
	renderMaps();
	renderTowers();
	renderMonsters();
})();
