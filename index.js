// import express from 'express';
const express = require('express')
const { MongoClient } = require('mongodb')
const cors = require('cors')
require('dotenv').config()

const url = `mongodb+srv://${process.env.API_ID}:${process.env.API_PASS}@cluster0.xueiu0e.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(url);
const dbName='chart-data';

const app = express();
const port = 3000;

let data={
    data:{
        yearVsCount:{},
        sectorVsCount:{},
        sectorVsLike:{},       //{sector: , like: ,likeCount: , relevance: ,relevanceCount: ,  }
        yearVsSector:{},       //{year: , sector:[{sector1: counts1: }]}
        endYearVsCount:{},   
        sectorVsRegion:{},
    },
    filterOption:{
        year:[],
        endDate:[],
        topic:[],
        sector:[],
        region:[],
        source:[],
        country:[],
    },
}

let filters={
    year:'All',
    endDate:'All',
    topic:'All',
    sector:'All',
    region:'All',
    source:'All',
    country:'All',
}

const filterDbName={
    year:'published',
    endDate:'end_year',
    country:'country',
    region:'region',
    sector:'sector',
    topic:'topic',
    source:'source',
}


app.listen(port,()=>console.log(`listening at ${port}`))
app.use(cors());
app.use(express.static('dist'));
app.use(express.json({ limit: '1mb' }));

function calFilter(){
    filterArray=Object.keys(filters).map(key => {
        if(filters[key]=='All')
            return {}
        else
            return {
                [filterDbName[key]]:filters[key]}
    })

    return filterArray
}

let flag=true;

async function connectToDB(){
    await client.connect();
    const db=client.db(dbName);
    const collection=db.collection('Charts')

    const tempData=await collection.find({}).toArray();
    tempData.forEach(EachData => {
        if(EachData.published !==''){
            const date= new Date(EachData.published);
            const year= date.getFullYear();
            if(year in data.data.yearVsCount)
                data.data.yearVsCount[year].count++;
            else
                data.data.yearVsCount[year]={count:1};
            if(EachData.sector !==''){
                // console.log(EachData.sector,year)
                if(year in data.data.yearVsSector && EachData.sector in data.data.yearVsSector[year]){
                    data.data.yearVsSector[year][EachData.sector].count++;
                }
                else{
                    if(!(year in data.data.yearVsSector))
                        data.data.yearVsSector[year]={}
                    data.data.yearVsSector[year]={...data.data.yearVsSector[year],
                                                    [EachData.sector]:{count:1}
                                                }
                        
                }
            }
        }
        if(EachData.sector !==''){
            if(EachData.sector in data.data.sectorVsCount)
                data.data.sectorVsCount[EachData.sector].count++;
            else
                data.data.sectorVsCount[EachData.sector]={count:1};
            
        }
        if(EachData.sector !=='' && EachData.likelihood !=='' && EachData.intensity !==''){
            if(EachData.sector in data.data.sectorVsLike){
                data.data.sectorVsLike[EachData.sector].like+=parseInt(EachData.likelihood);
                data.data.sectorVsLike[EachData.sector].likeCount++;
                data.data.sectorVsLike[EachData.sector].int+=parseInt(EachData.intensity);
                data.data.sectorVsLike[EachData.sector].intCount++;
            }
            else{
                data.data.sectorVsLike[EachData.sector]={
                                                        like:parseInt(EachData.likelihood),
                                                        likeCount:1,
                                                        int:parseInt(EachData.intensity),
                                                        intCount:1
                                                    };
            }
        }
        if(EachData.end_year !==''){
            if(EachData.end_year in data.data.endYearVsCount)
                data.data.endYearVsCount[EachData.end_year].count++;
            else
                data.data.endYearVsCount[EachData.end_year]={count:1};
            
        }

        if(EachData.sector !==''){
            if(EachData.region !==''){
                // sectorVsRegion
                data.filterOption.region.push(EachData.region)
                if(EachData.sector in data.data.sectorVsRegion && EachData.region in data.data.sectorVsRegion[EachData.sector]){
                    data.data.sectorVsRegion[EachData.sector][EachData.region].count++;
                }
                else{
                    if(!(EachData.sector in data.data.sectorVsRegion))
                        data.data.sectorVsRegion[EachData.sector]={}
                    data.data.sectorVsRegion[EachData.sector]={...data.data.sectorVsRegion[EachData.sector],
                                                                [EachData.region]:{count:1}
                                                            }
                }
            }
        }
        
        if(EachData.country !=='')
            data.filterOption.country.push(EachData.country)
        if(EachData.source !=='')
            data.filterOption.source.push(EachData.source)
        if(EachData.topic !=='')
            data.filterOption.topic.push(EachData.topic)
    })
    data.filterOption.region=["All",...new Set(data.filterOption.region)]
    data.filterOption.country=["All",...new Set(data.filterOption.country)]
    data.filterOption.source=["All",...new Set(data.filterOption.source)]
    data.filterOption.topic=["All",...new Set(data.filterOption.topic)]
    data.filterOption.year=["All",...Object.keys(data.data.yearVsCount)]
    data.filterOption.sector=["All",...Object.keys(data.data.sectorVsCount)]
    data.filterOption.endDate=["All",...Object.keys(data.data.endYearVsCount)]
    
}

app.get('/api',(req,res)=>{
    const query= req.query
    connectToDB()
    .then(dbRes => {
        filters=query
        res.json(data)
    })
    .catch(console.error)
    .finally(()=>client.close())
    
    
})