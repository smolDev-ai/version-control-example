const router = require("express").Router();
const recipes = require('../data/models/recipesModel')
const mid = require('../middleware/customMiddleware')


router.post('/', mid.restrict, (req, res) => {
    console.log(req.user)
    
    let recipe = {
        author_id: req.user.subject,
        ...req.body
    }

    
    recipes
    .add(recipe)
    .then(saved => {
        res.status(201).json(saved)
    })
})

module.exports = router;