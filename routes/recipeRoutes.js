const router = require("express").Router()
const recipes = require("../data/models/recipesModel")
const mid = require("../middleware/customMiddleware")

router.get("/:id", (req, res) => {
  recipes.findById(req.params.id).then(x => {
    res.status(200).json(x)
  })
})
router.get("/", (req, res) => {
  recipes.find().then(x => {
    res.status(200).json(x)
  })
})
router.post("/:id", mid.restrict, (req, res) => {
  const recipe = {
    author_id: req.user.subject,
    forked_from: req.params.id
  }
  recipes
    .fork_recipe(req.params.id, recipe)
    .then(saved => res.status(200).json(saved))
    .catch(err => res.status(500).json(err.stack))
})

router.post("/", mid.restrict, (req, res) => {
  let recipe = {
    author_id: req.user.subject,
    ...req.body
  }

  recipes.add(recipe).then(saved => {
    res.status(201).json(saved)
  })
})

router.put("/:id", mid.restrict, (req, res) => {
  let { id } = req.params
  let changes = {
    author_id: req.user.subject,
    ...req.body
  }

  recipes.updateRecipe(id, changes).then(saved => {
    res.status(201).json(saved)
  })
})

module.exports = router
