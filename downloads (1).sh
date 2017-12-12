#!/bin/sh

## SOFTWARE: fastqc
## VERSION: 0.11.5
#wget https://www.bioinformatics.babraham.ac.uk/projects/fastqc/fastqc_v0.11.5.zip
#unzip fastqc_v0.11.5.zip
#cd FastQC/
#chmod 755 fastqc
#cd ..


## SOFTWARE: repli-seq-pipeline
## COMMIT: f2eb460
git clone https://github.com/4dn-dcic/repli-seq-pipeline
cd repli-seq-pipeline
git checkout f2eb460
rm -rf sample_data
chmod +x *
cd ..


## SOFTWARE: cutadapt
## VERSION: 1.14
pip install cutadapt==1.14


## SOFTWARE: bwa
## VERSION: 0.7.15
wget https://github.com/lh3/bwa/archive/v0.7.15.tar.gz
tar -xzf v0.7.15.tar.gz
cd bwa-0.7.15
make
cd ..
ln -s bwa-0.7.15 bwa


## SOFTWARE: bedtools
## VERSION: 2.26.0
wget https://github.com/arq5x/bedtools2/releases/download/v2.26.0/bedtools-2.26.0.tar.gz
tar -zxvf bedtools-2.26.0.tar.gz
cd bedtools2
make
cd ..


## SOFTWARE: samtools
## VERSION: 1.4
wget https://github.com/samtools/samtools/releases/download/1.4/samtools-1.4.tar.bz2
tar -xjf samtools-1.4.tar.bz2
cd samtools-1.4
make
cd ..
ln -s samtools-1.4 samtools


