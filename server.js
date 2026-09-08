const express = require('express');
const app = express();
app.use(express.json());
const PORT = 3000;

let trips = [
    {
        id: 1,
        from: 'Минск',
        to: 'Могилев',
        date: '10-09-2026',
        time: '10:00',
        price: 150,
        driver: 'Иван',
        seats: 40,
        rating: 4.8
    },
    {
        id: 2,
        from: 'Казань',
        to: 'Москва',
        date: '10-09-2026',
        time: '08:30',
        price: 200,
        driver: 'Мария',
        seats: 40,
        rating: 4.5
    }
];
let nextId = 3;

app.get('/trips', (req, res) => {
    res.json(trips);
});

app.get('/trips/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const trip = trips.find(t => t.id === id);
    if (!trip) {
        return res.status(404).json({ error: 'Поездка не найдена' });
    }
    res.json(trip);
});

app.post('/trips', (req, res) => {
    const { from, to, date, time, price, driver, seats, rating } = req.body;
    
    if (!from || !to || !date || !time || !price || !driver || !seats) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    const newTrip = {
        id: nextId++,
        from,
        to,
        date,
        time,
        price,
        driver,
        seats,
        rating: rating || 0
    };
    
    trips.push(newTrip);
    res.status(201).json(newTrip);
});

app.put('/trips/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const trip = trips.find(t => t.id === id);
    
    if (!trip) {
        return res.status(404).json({ error: 'Поездка не найдена' });
    }
    
    const { from, to, date, time, price, driver, seats, rating } = req.body;
    
    if (!from || !to || !date || !time || !price || !driver || !seats) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    trip.from = from;
    trip.to = to;
    trip.date = date;
    trip.time = time;
    trip.price = price;
    trip.driver = driver;
    trip.seats = seats;
    trip.rating = rating || 0;
    
    res.json(trip);
});

app.delete('/trips/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = trips.findIndex(t => t.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Поездка не найдена' });
    }
    
    trips.splice(index, 1);
    res.status(204).send();
});

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});