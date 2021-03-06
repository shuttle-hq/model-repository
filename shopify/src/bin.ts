import { PrismaClient, events } from '@prisma/client'
import express from 'express'
import {create} from "domain";

const selectQuery = (fields?: string) => {
    const entries = fields?.split(",")
        .map(field => [field, true])
    return entries === undefined ? undefined : Object.fromEntries(entries)
}

const prisma = new PrismaClient()
const app = express()
const router = express.Router()
router.use(express.json())

router.get(`/events/:event_id.json`, async (req, res) => {
    const select = selectQuery(req.query.fields as string)

    let result: { ObjectId?: Buffer } | null = await prisma.events.findUnique({
        where: {
            id: Number(req.params.event_id)
        },
        select,
    })

    if (result === null) {
        res.status(404).send()
    } else {
        delete result.ObjectId
        res.json({
            event: result
        })
    }
})

router.get(`/events.json`, async (req, res) => {
    const limit = Number(req.query.limit || "50")
    if (limit > 250) {
        return res.status(400).send()
    }

    const since_id = req.query.since_id
    const since_id_where = since_id === undefined ? {} : {
        subject_id: {
            gt: Number(since_id)
        }
    }

    const created_at_min = req.query.created_at_min as string;
    const created_at_max = req.query.created_at_max as string;
    const created_at_where = (created_at_min === undefined &&  created_at_max === undefined) ? {} : {
        created_at: {
            gte: created_at_min === undefined ? undefined : new Date(created_at_min),
            lte: created_at_max === undefined ? undefined :new Date(created_at_max)
        }
    }

    const verb = req.query.verb as string
    const verb_where = verb === undefined ? {} : {
        verb: verb
    }

    const filter = (req.query.filter as string)?.split(",")
    const filter_where = filter === undefined ? {} : {
        subject_type: {
            in: filter
        }
    }

    const where = {
        ...since_id_where,
        ...verb_where,
        ...filter_where,
        ...created_at_where
    }

    const select = selectQuery(req.query.fields as string)

    let result: { ObjectId?: Buffer }[] = await prisma.events.findMany({
        where,
        take: limit,
        select
    })

    result.forEach((event) => {
        delete event.ObjectId
    })

    res.json({
        events: result
    })
})

const server = app.use("/admin/api/2021-07", router).listen(3000, () =>
    console.log("Listening at http://localhost:3000")
)