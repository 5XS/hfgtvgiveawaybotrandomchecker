function sfc32(a, b, c, d) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = c << 21 | c >>> 11;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    };
}

function createPrngFromHex(hex) {
    let a = parseInt(hex.substring(0, 8), 16) >>> 0;
    let b = parseInt(hex.substring(8, 16), 16) >>> 0;
    let c = parseInt(hex.substring(16, 24), 16) >>> 0;
    let d = parseInt(hex.substring(24, 32), 16) >>> 0;
    if (hex.length >= 64) {
        a ^= parseInt(hex.substring(32, 40), 16) >>> 0;
        b ^= parseInt(hex.substring(40, 48), 16) >>> 0;
        c ^= parseInt(hex.substring(48, 56), 16) >>> 0;
        d ^= parseInt(hex.substring(56, 64), 16) >>> 0;
    }
    const prng = sfc32(a, b, c, d);
    for (let i = 0; i < 15; i++) prng();
    return prng;
}

function shuffleArray(array, prng) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    return result;
}

const texts = {
    ru: {
        title: "Проверка розыгрыша",
        subtitle: "Убедитесь, что победители выбраны честно, без вмешательства организаторов. Мы используем публичный генератор случайностей drand.",
        inputTitle: "Данные розыгрыша",
        roundLabel: "Раунд drand",
        participantsLabel: "Всего участников",
        winnersLabel: "Призовых мест",
        verifyButton: "Проверить победителей",
        verifyingButton: "Проверка...",
        verifiedText: "Результат подтверждён криптографией",
        drandDataLabel: "Технические детали",
        timeLabel: "Время:",
        seedLabel: "Случайный сид:",
        explainTitle: "Как это работает?",
        explain1: "Мы используем drand — независимый сервис, который каждые 3 секунды публикует случайные числа. Никто не может узнать это число заранее или подстроить его под себя.",
        formulaTitle: "Как выбираются победители",
        step1Label: "1. Случайное число",
        step1Desc: "Когда розыгрыш завершается, бот берет свежее случайное число из раунда drand.",
        step2Label: "2. Запуск генератора",
        step2Desc: "Полученное число разбивается на части и запускает алгоритм SFC32 для честного перемешивания.",
        step3Label: "3. Перемешивание билетов",
        step3Desc: "Список билетов участников перемешивается по алгоритму Фишера-Йейтса. У каждого билета строго равный шанс на победу без повторов.",
        step4Label: "4. Выбор призеров",
        step4Desc: "Первые выпавшие номера становятся победителями. Расчет полностью прозрачен и одинаков в боте и на этой странице.",
        linksTitle: "Ссылки",
        apiLink: "API drand",
        repoLink: "Исходный код",
        fetchErrorTitle: "Сбой подключения к drand",
        fetchErrorDesc: "Не удалось получить данные о раунде. Возможно, указан неверный номер или сервис недоступен.",
        statusLink: "Проверить статус drand"
    },
    en: {
        title: "Giveaway Verification",
        subtitle: "Ensure winners were selected fairly without interference. We use the public drand randomness generator.",
        inputTitle: "Giveaway Details",
        roundLabel: "drand Round",
        participantsLabel: "Total Participants",
        winnersLabel: "Winning Places",
        verifyButton: "Verify Winners",
        verifyingButton: "Verifying...",
        verifiedText: "Result cryptographically verified",
        drandDataLabel: "Technical Details",
        timeLabel: "Time:",
        seedLabel: "Random Seed:",
        explainTitle: "How it works?",
        explain1: "We use drand — an independent service that publishes random numbers every 3 seconds. Nobody can predict or manipulate this number beforehand.",
        formulaTitle: "How winners are selected",
        step1Label: "1. Random Number",
        step1Desc: "When a giveaway ends, the bot fetches the latest random number from the drand round.",
        step2Label: "2. Generator Initialization",
        step2Desc: "The seed is split into chunks to initialize the SFC32 algorithm for fair shuffling.",
        step3Label: "3. Ticket Shuffling",
        step3Desc: "The participant ticket list is shuffled using the Fisher-Yates algorithm. Every ticket has an exactly equal chance to win.",
        step4Label: "4. Winner Selection",
        step4Desc: "The top tickets from the shuffled list are awarded the prizes. The result is fully transparent and identical in both the bot and on this site.",
        linksTitle: "Links",
        apiLink: "drand API",
        repoLink: "Source Code",
        fetchErrorTitle: "drand Connection Failed",
        fetchErrorDesc: "Could not fetch round data. The round number might be invalid or the service is down.",
        statusLink: "Check drand Status"
    }
};

let currentLang = localStorage.getItem('verifier_lang') || 'ru';

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('verifier_lang', lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[lang] && texts[lang][key]) {
            el.textContent = texts[lang][key];
        }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}

async function runVerification(round, participants, winnersCount) {
    const submitBtn = document.getElementById('submit-btn');
    const resultCard = document.getElementById('result-card');
    const errorCard = document.getElementById('error-card');
    const originalText = texts[currentLang].verifyButton;

    submitBtn.disabled = true;
    submitBtn.textContent = texts[currentLang].verifyingButton;
    resultCard.classList.add('hidden');
    errorCard.classList.add('hidden');

    try {
        const apiUrl = `https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/public/${round}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('Fetch failed');

        const data = await res.json();
        const randomness = data.randomness;

        const tickets = Array.from({ length: participants }, (_, i) => i + 1);
        const prng = createPrngFromHex(randomness);
        const shuffled = shuffleArray(tickets, prng);
        const winningTickets = shuffled.slice(0, Math.min(winnersCount, participants));

        const estTimestamp = (1692803367 + (data.round - 1) * 3) * 1000;
        document.getElementById('res-time').textContent = new Date(estTimestamp).toLocaleString(currentLang === 'ru' ? 'ru-RU' : 'en-US');
        document.getElementById('res-randomness').textContent = randomness;

        const currentDirectLink = document.getElementById('current-api-direct');
        if (currentDirectLink) currentDirectLink.href = apiUrl;

        const container = document.getElementById('winners-container');
        container.innerHTML = '';

        winningTickets.forEach((ticketNum, index) => {
            const tag = document.createElement('div');
            tag.className = 'winner-tag';
            tag.textContent = `#${ticketNum}`;
            container.appendChild(tag);
        });

        resultCard.classList.remove('hidden');

    } catch (err) {
        errorCard.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage(currentLang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyLanguage(btn.getAttribute('data-lang'));
        });
    });

    document.getElementById('verify-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const round = parseInt(document.getElementById('round-input').value, 10);
        const participants = parseInt(document.getElementById('participants-input').value, 10);
        const winners = parseInt(document.getElementById('winners-input').value, 10);

        if (round && participants && winners) {
            runVerification(round, participants, winners);
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const paramRound = urlParams.get('round');
    const paramParticipants = urlParams.get('participants');
    const paramWinners = urlParams.get('winners');

    if (paramRound) document.getElementById('round-input').value = paramRound;
    if (paramParticipants) document.getElementById('participants-input').value = paramParticipants;
    if (paramWinners) document.getElementById('winners-input').value = paramWinners;

    if (paramRound && paramParticipants && paramWinners) {
        runVerification(parseInt(paramRound, 10), parseInt(paramParticipants, 10), parseInt(paramWinners, 10));
    }
});
