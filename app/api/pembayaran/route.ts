import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { cookies } from 'next/headers'
import { verifyAuth } from '@/lib/auth';
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) { 
  try {
    const body = await req.json();

    let userAuth : string = "";
    let loketAuth : string = "";
    let passAuth : string = "";

    const authHeader = req.headers.get('Authorization');
    const tokenHeader = authHeader?.replace("Bearer ","") || "";

    const isVerif  = await verifyAuth(tokenHeader);
    if (isVerif.status) {
      userAuth = isVerif.data?.user || "";
      loketAuth = isVerif.data?.kodeloket || "";  
      passAuth =  isVerif.data?.pass || "";     
    } else {
      return NextResponse.json(
        { success: false,
          rescode : 401,
          message: 'Screet Key failed' },
        { status: 401 }
      )     
    }
       // cek user verifikasi
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

    
      
    if (!body.periode || !body.no_pelanggan)  {
      return NextResponse.json(
        { 
          rescode : 310,
          success: false,
          message: 'Data Body Invalid' },
        { status: 200 }
      )         
    }

    const isPelcoklit = await prismadb.pel_coklit.findUnique({
      where : {
        no_pelanggan : body.no_pelanggan || ""
      }
    })

    if (!isPelcoklit) {
      return NextResponse.json(
        {
          rescode : 211,
          success : false,
          message : "No Pelanggan Coklit Tidak Terdaftar",
          data : {
            nopel : body.no_pelanggan || ""
          }
        }

        ,{status : 200})  
    }
    const isPel = await prismadb.customer.findUnique({
      where : {
        nosam :  body.no_pelanggan || "",
      }
    })
    if (!isPel) {
      return NextResponse.json(
        {
          rescode : 211,
          success : false,
          message : "No Pelanggan Tidak Terdaftar",
          data : {
            nopel : body.no_pelanggan || "" 
          }
        }

        ,{status : 200})  
    }
    if (isPel.status !== "2") {
      return NextResponse.json(
        {
          rescode : 212,
          success : false,
          message : "No Pelanggan Non Aktif, Harap Ke Kantor PDAM",
          data : {
            nopel : body.no_pelanggan || "" 
          }
        }

        ,{status : 200})        
    }
    
    const datatagihan : any[] = await prismadb.$queryRaw(
      // Prisma.sql`call infotag_b_byr(${body.no_pelanggan},${userAuth})`
      
      Prisma.sql`call infotag_coklit(${body.no_pelanggan},${body.periode})`
    )
    
    // console.log(datatagihan)
    if (!datatagihan || datatagihan.length === 0) {
      return NextResponse.json(
        {
          rescode : 215,
          success : false,
          message : "Tagihan Sudah Lunas",
          data : {
            nopel : body.no_pelanggan || "" 
          }
        }

        ,{status : 200})  
    }

    const tgl : any = await prismadb.$queryRaw`Select now() as tgl`;
    let dataStsBayar =  [];
    let jmlgagalbayar = 0; 
    for (const dataTag of datatagihan) {
      const dendatunggakan = parseInt(dataTag.f11);
      const ppn = parseInt(dataTag.f12);
      const periode = dataTag.f1;
      try {

        const isBayar : any [] = await prismadb.$queryRaw(
          Prisma.sql`call bayartagihan(${body.no_pelanggan},${periode},${isUser.nama},${dendatunggakan},${ppn})` 
        )
        // console.log(isBayar);
        const coderespon = parseInt(isBayar[0].f0)
        if ( coderespon === 200) {
          const dumpDt = {
            periode : periode,
            status : "OK"
          }
          dataStsBayar.push(dumpDt)
        } else {
          jmlgagalbayar += 1;
          const dumpDt = {
            periode : periode,
            status : "GAGAL"
          }
          dataStsBayar.push(dumpDt);
        }

      } catch (error) {
        jmlgagalbayar += 1;
        const dumpDt = {
          periode : periode,
          status : "ERROR"
        }   
        dataStsBayar.push(dumpDt);     
      }      
    }

    let resCodeAkhir = 0;
    let messageAkhir = "";
    let succesAkhir = false;

    if (jmlgagalbayar > 0) {
      if (jmlgagalbayar === datatagihan.length) {
        resCodeAkhir = 399;
        messageAkhir = "Pembayaran Gagal";
        succesAkhir = false;
      } else {
        resCodeAkhir = 305;
        messageAkhir = "Pembayaran prematur / hanya sebagian Periode terlunasi";
        succesAkhir = false;
      }
    } else {
      resCodeAkhir = 300;
      messageAkhir = "Pembayaran Sukses";
      succesAkhir = true;
    }


  


    const result = 
    {
      rescode : resCodeAkhir,
      success : succesAkhir,
      message : messageAkhir,
      data : {

        no_pelanggan : isPel.nosam,
        periode :  dataStsBayar
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
