import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { cookies } from 'next/headers'
import { verifyAuth } from '@/lib/auth';
import bcrypt from "bcrypt";

export async function GET(req: NextRequest) { 
  try {
    let userAuth : string = "";
    let loketAuth : string = "";
    let passAuth : string = "";
    const [nopel, periode] = req.url.split('/').slice(-2);

    const authHeader = req.headers.get('Authorization');
    const tokenHeader = authHeader?.replace("Bearer ","") || "";

    const isVerif  = await verifyAuth(tokenHeader);
    if (isVerif.status) {
      userAuth = isVerif.data?.user || "";
      loketAuth ="PPOB";  
      passAuth =  isVerif.data?.pass || "";     
    } else {
      return NextResponse.json(
        { success: false,
          rescode : 401,
          message: 'Screet Key failed' },
        { status: 401 }
      )     
    }


    const isUser =  await prismadb.user.findUnique({
      where : {
        id : userAuth,
        pass : passAuth
      }
    });
    
    if (!isUser) {
      return NextResponse.json(
        {
          rescode : 210,
          success : false,
          message : "User Tidak Terdaftar",
          data : {
            namauser : userAuth,
            passworduser : passAuth,
            kodeloket : loketAuth
          }
        }

        ,{status : 200})  
    }
    
    const isPelcoklit = await prismadb.pel_coklit.findUnique({
      where : {
        no_pelanggan :  nopel || ""
      }
    })
    if (!isPelcoklit) {
      return NextResponse.json(
        {
          rescode : 211,
          success : false,
          message : "No Pelanggan Coklit Tidak Terdaftar",
          data : {
            nopel : nopel || ""
          }
        }

        ,{status : 200})  
    }

    const isPel = await prismadb.customer.findUnique({
      where : {
        nosam :  nopel || ""
      }
    })
    if (!isPel) {
      return NextResponse.json(
        {
          rescode : 211,
          success : false,
          message : "No Pelanggan Tidak Terdaftar",
          data : {
            nopel : nopel || ""
          }
        }

        ,{status : 200})  
    }

    if (isPel.status !== "2")  {
      return NextResponse.json(
        {
          rescode : 212,
          success : true,
          message : "No Pelanggan Non Aktif, Harap Ke Kantor PDAM",
          data : {
            nopel : nopel || "" 
          }
        }

        ,{status : 200})        
    } 
    
    const datatagihan : any[] = await prismadb.$queryRaw(
      Prisma.sql`call infotag_coklit(${nopel},${periode})` 
    )
    
    if (!datatagihan || datatagihan.length === 0) {
      return NextResponse.json(
        {
          rescode : 215,
          success : false,
          message : "Tagihan Sudah Lunas",
          data : {
            nopel : nopel || "",
            periode :  periode || "" 
          }
        }

        ,{status : 200})  
    }

    // datatagihan.reverse()
    // console.log(datatagihan);
    

    const resultDataTag = datatagihan.map(val => {
      const res = {
        periode : val.f2 ,
        golongan : val.f7 ,
        stanlalu : parseInt(val.f3),
        stanini : parseInt(val.f4),
        pakaim3 : parseInt(val.f5),
        hargaair : parseInt(val.f6),
        adminpdam : parseInt(val.f8),
        danameter : parseInt(val.f7),
        retribusi : 0,
        denda : parseInt(val.f11)+parseInt(val.f12),
        total : parseInt(val.f13)
      }

      return res;
    })

    const result = 
    {
      rescode : 200,
      success : true,
      message : "Tagihan Tersedia",
      data : {
        no_pelanggan : isPel.nosam.trim(),
        nama : isPel.nama?.trim(),
        alamat : isPel.al?.trim(),
        tagihan : resultDataTag
      }
    }



    return NextResponse.json(result,{status : 200})   

  } catch (error) {
    return NextResponse.json({
      rescode : 500,
      success : false,
      message : `General Error : ${error}`
    }, { status: 500 })
  }


}
