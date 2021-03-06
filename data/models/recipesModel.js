const db = require("../dbConfig")

module.exports = {
  find,
  findById,
  findByTitle,
  add,
  updateRecipe,
  fork_recipe,
  remove
}

function find() {
  return db("recipes as r")
    .join("instructions as i", "r.id", "=", "i.recipe_id")
    .select(
      "r.*",
      db.raw(
        `json_agg(json_build_object('step', i.step_number, 'body', i.body)) as instructions`
      )
    )
    .groupBy("r.id")
}

function findById(id) {
  return db("recipes as r")
    .where("r.id", "=", id)
    .join("instructions as i", "r.id", "=", "i.recipe_id")
    .select(
      "r.*",
      db.raw(
        `json_agg(json_build_object('step', i.step_number, 'body', i.body)) as instructions`
      )
    )
    .groupBy("r.id")
    .first()
}

function findByTitle(title) {
  return db("recipes").where(title)
}

function add(recipe) {
  // TODO: add code here
  const { instructions, ...recipeEntry } = recipe

  return db("recipes")
    .insert(recipeEntry, "id")
    .then(rec => {
      const [id] = rec
      const InstEntries = instructions.map((inst, i) => {
        return { step_number: i + 1, body: inst.body, recipe_id: id }
      })

      return db("instructions")
        .insert(InstEntries)
        .then(inst_rec => {
          return findById(id)
        })
    })
}

function addInstruction(id, instructions) {
  const InstEntries = instructions.map((inst, i) => {
    return { step_number: i + 1, body: inst.body, recipe_id: id }
  })

  return db("instructions").insert(InstEntries)
}
/*  Future Megan! Remove the transaction and figure out how to convert the recipe
     and instruction data into stringified json and add it to the edits table
     */
function updateRecipe(id, changes) {
  return db.transaction(trx => {
    const updatedRecipe = {
      title: changes.title,
      prep_time: changes.prep_time,
      cook_time: changes.cook_time,
      notes: changes.notes
    }

    const fullRecipe = {
      ...updatedRecipe,
      instructions: changes.instructions
    }

    return trx("recipes")
      .where({ id })
      .update(updatedRecipe)
      .then(upInst => {
        const insti = []
        let instiDel
        changes.instructions.map((inst, i) => {
          if (!inst.step_number && !inst.body) {
            instiDel = i + 1
          } else if (!inst.step_number) {
            return insti.push({
              step_number: i + 1,
              body: inst.body,
              recipe_id: id
            })
          } else {
            return trx("instructions")
              .where({ recipe_id: id })
              .andWhere({ step_number: inst.step_number })
              .update({ body: inst.body })
          }
        })
        return trx("instructions")
          .insert(insti)
          .then(ed => {
            return trx("instructions")
              .where({ recipe_id: id })
              .andWhere({ step_number: instiDel })
              .del()
              .then(eds => {
                const Edits = {
                  owner_id: changes.author_id,
                  recipe_id: id,
                  changes: JSON.stringify(fullRecipe)
                }

                return trx("edits")
                  .insert(Edits)
                  .then(eds => findById(id))
              })
          })
      })
  })
}

// return db.transaction(trx => {
//   const updatedRecipe = {
//     title: changes.title,
//     prep_time: changes.prep_time,
//     cook_time: changes.cook_time,
//     notes: changes.notes
//   }

//   trx("recipes")
//   .where({id: changes.id})
//   .update(updatedRecipe)
//   .then(upRec => {
//     return trx("instructions").where({recipe_id: changes.id})
//     // then "Edits" gets a new row with a revision number + the whole JSON obj

//   })
// })
/**
 * duplicates a recipe in the database, giving it the user who duplicated it ownership over the duplicate
 * @param  {Number} recipe_id
 * @param  {Object} info
 */
function fork_recipe(recipe_id, info) {
  const { author_id, forked_from } = info
  return findById(recipe_id).then(res => {
    const { instructions, ...recipe } = res
    delete recipe.id
    recipe.author_id = author_id
    recipe.forked_from = forked_from

    const forkedrec = {
      ...recipe
    }
    return db("recipes")
      .insert(forkedrec, "id")
      .then(rec => {
        const [id] = rec
        const InstEntries = instructions.map((inst, i) => {
          return { step_number: i + 1, body: inst.body, recipe_id: id }
        })

        return db("instructions")
          .insert(InstEntries)
          .then(inst_rec => {
            return findById(id)
          })
      })
  })
}

function remove(id) {
  // TODO: add code here
}
