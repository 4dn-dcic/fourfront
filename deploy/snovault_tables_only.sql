--
-- PostgreSQL database dump
--

-- Dumped from database version 9.4.7
-- Dumped by pg_dump version 9.4.0
-- Started on 2016-09-22 11:10:22 EDT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

DROP DATABASE ebdb;
--
-- TOC entry 2989 (class 1262 OID 17794)
-- Name: ebdb; Type: DATABASE; Schema: -; Owner: postgresql
--

CREATE DATABASE ebdb WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8';


ALTER DATABASE ebdb OWNER TO postgresql;

\connect ebdb

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgresql
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO postgresql;

--
-- TOC entry 2990 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgresql
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 183 (class 3079 OID 12776)
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- TOC entry 2992 (class 0 OID 0)
-- Dependencies: 183
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- TOC entry 196 (class 1255 OID 17836)
-- Name: snovault_transaction_notify(); Type: FUNCTION; Schema: public; Owner: postgresql
--

CREATE FUNCTION snovault_transaction_notify() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
    BEGIN
        PERFORM pg_notify('snovault.transaction', NEW.xid::TEXT);
        RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.snovault_transaction_notify() OWNER TO postgresql;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- TOC entry 175 (class 1259 OID 17813)
-- Name: blobs; Type: TABLE; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE TABLE blobs (
    blob_id uuid NOT NULL,
    data bytea
);


ALTER TABLE blobs OWNER TO postgresql;

--
-- TOC entry 182 (class 1259 OID 17892)
-- Name: current_propsheets; Type: TABLE; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE TABLE current_propsheets (
    rid uuid NOT NULL,
    name character varying NOT NULL,
    sid integer NOT NULL
);


ALTER TABLE current_propsheets OWNER TO postgresql;

--
-- TOC entry 180 (class 1259 OID 17859)
-- Name: keys; Type: TABLE; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE TABLE keys (
    name character varying NOT NULL,
    value character varying NOT NULL,
    rid uuid NOT NULL
);


ALTER TABLE keys OWNER TO postgresql;

--
-- TOC entry 181 (class 1259 OID 17873)
-- Name: links; Type: TABLE; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE TABLE links (
    source uuid NOT NULL,
    rel character varying NOT NULL,
    target uuid NOT NULL
);


ALTER TABLE links OWNER TO postgresql;

--
-- TOC entry 179 (class 1259 OID 17840)
-- Name: propsheets; Type: TABLE; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE TABLE propsheets (
    sid integer NOT NULL,
    rid uuid NOT NULL,
    name character varying NOT NULL,
    properties jsonb,
    tid uuid NOT NULL
);


ALTER TABLE propsheets OWNER TO postgresql;

--
-- TOC entry 178 (class 1259 OID 17838)
-- Name: propsheets_sid_seq; Type: SEQUENCE; Schema: public; Owner: postgresql
--

CREATE SEQUENCE propsheets_sid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE propsheets_sid_seq OWNER TO postgresql;

--
-- TOC entry 2993 (class 0 OID 0)
-- Dependencies: 178
-- Name: propsheets_sid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgresql
--

ALTER SEQUENCE propsheets_sid_seq OWNED BY propsheets.sid;


--
-- TOC entry 174 (class 1259 OID 17805)
-- Name: resources; Type: TABLE; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE TABLE resources (
    rid uuid NOT NULL,
    item_type character varying NOT NULL
);


ALTER TABLE resources OWNER TO postgresql;

--
-- TOC entry 177 (class 1259 OID 17823)
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE TABLE transactions (
    "order" integer NOT NULL,
    tid uuid NOT NULL,
    data jsonb,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    xid bigint DEFAULT txid_current()
);


ALTER TABLE transactions OWNER TO postgresql;

--
-- TOC entry 176 (class 1259 OID 17821)
-- Name: transactions_order_seq; Type: SEQUENCE; Schema: public; Owner: postgresql
--

CREATE SEQUENCE transactions_order_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE transactions_order_seq OWNER TO postgresql;

--
-- TOC entry 2994 (class 0 OID 0)
-- Dependencies: 176
-- Name: transactions_order_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgresql
--

ALTER SEQUENCE transactions_order_seq OWNED BY transactions."order";


--
-- TOC entry 173 (class 1259 OID 17797)
-- Name: users; Type: TABLE; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE TABLE users (
    user_id integer NOT NULL,
    name character varying(60),
    email character varying(60),
    password character varying(60)
);


ALTER TABLE users OWNER TO postgresql;

--
-- TOC entry 172 (class 1259 OID 17795)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgresql
--

CREATE SEQUENCE users_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_user_id_seq OWNER TO postgresql;

--
-- TOC entry 2995 (class 0 OID 0)
-- Dependencies: 172
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgresql
--

ALTER SEQUENCE users_user_id_seq OWNED BY users.user_id;


--
-- TOC entry 2844 (class 2604 OID 17843)
-- Name: sid; Type: DEFAULT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY propsheets ALTER COLUMN sid SET DEFAULT nextval('propsheets_sid_seq'::regclass);


--
-- TOC entry 2841 (class 2604 OID 17826)
-- Name: order; Type: DEFAULT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY transactions ALTER COLUMN "order" SET DEFAULT nextval('transactions_order_seq'::regclass);


--
-- TOC entry 2840 (class 2604 OID 17800)
-- Name: user_id; Type: DEFAULT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY users ALTER COLUMN user_id SET DEFAULT nextval('users_user_id_seq'::regclass);


--
-- TOC entry 2852 (class 2606 OID 17820)
-- Name: blobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY blobs
    ADD CONSTRAINT blobs_pkey PRIMARY KEY (blob_id);


--
-- TOC entry 2866 (class 2606 OID 17899)
-- Name: current_propsheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY current_propsheets
    ADD CONSTRAINT current_propsheets_pkey PRIMARY KEY (rid, name);


--
-- TOC entry 2861 (class 2606 OID 17866)
-- Name: keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY keys
    ADD CONSTRAINT keys_pkey PRIMARY KEY (name, value);


--
-- TOC entry 2864 (class 2606 OID 17880)
-- Name: links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY links
    ADD CONSTRAINT links_pkey PRIMARY KEY (source, rel, target);


--
-- TOC entry 2858 (class 2606 OID 17848)
-- Name: propsheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY propsheets
    ADD CONSTRAINT propsheets_pkey PRIMARY KEY (sid);


--
-- TOC entry 2850 (class 2606 OID 17812)
-- Name: resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (rid);


--
-- TOC entry 2854 (class 2606 OID 17832)
-- Name: transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY ("order");


--
-- TOC entry 2856 (class 2606 OID 17834)
-- Name: transactions_tid_key; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY transactions
    ADD CONSTRAINT transactions_tid_key UNIQUE (tid);


--
-- TOC entry 2846 (class 2606 OID 17804)
-- Name: users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 2848 (class 2606 OID 17802)
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgresql; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 2859 (class 1259 OID 17872)
-- Name: ix_keys_rid; Type: INDEX; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE INDEX ix_keys_rid ON keys USING btree (rid);


--
-- TOC entry 2862 (class 1259 OID 17891)
-- Name: ix_links_target; Type: INDEX; Schema: public; Owner: postgresql; Tablespace: 
--

CREATE INDEX ix_links_target ON links USING btree (target);


--
-- TOC entry 2875 (class 2620 OID 17837)
-- Name: snovault_transactions_insert; Type: TRIGGER; Schema: public; Owner: postgresql
--

CREATE TRIGGER snovault_transactions_insert AFTER INSERT ON transactions FOR EACH ROW EXECUTE PROCEDURE snovault_transaction_notify();


--
-- TOC entry 2873 (class 2606 OID 17900)
-- Name: current_propsheets_rid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY current_propsheets
    ADD CONSTRAINT current_propsheets_rid_fkey FOREIGN KEY (rid) REFERENCES resources(rid);


--
-- TOC entry 2874 (class 2606 OID 17905)
-- Name: current_propsheets_sid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY current_propsheets
    ADD CONSTRAINT current_propsheets_sid_fkey FOREIGN KEY (sid) REFERENCES propsheets(sid);


--
-- TOC entry 2869 (class 2606 OID 17910)
-- Name: fk_property_sheets_rid_name; Type: FK CONSTRAINT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY propsheets
    ADD CONSTRAINT fk_property_sheets_rid_name FOREIGN KEY (rid, name) REFERENCES current_propsheets(rid, name) DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 2870 (class 2606 OID 17867)
-- Name: keys_rid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY keys
    ADD CONSTRAINT keys_rid_fkey FOREIGN KEY (rid) REFERENCES resources(rid);


--
-- TOC entry 2871 (class 2606 OID 17881)
-- Name: links_source_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY links
    ADD CONSTRAINT links_source_fkey FOREIGN KEY (source) REFERENCES resources(rid);


--
-- TOC entry 2872 (class 2606 OID 17886)
-- Name: links_target_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY links
    ADD CONSTRAINT links_target_fkey FOREIGN KEY (target) REFERENCES resources(rid);


--
-- TOC entry 2867 (class 2606 OID 17849)
-- Name: propsheets_rid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY propsheets
    ADD CONSTRAINT propsheets_rid_fkey FOREIGN KEY (rid) REFERENCES resources(rid) DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 2868 (class 2606 OID 17854)
-- Name: propsheets_tid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgresql
--

ALTER TABLE ONLY propsheets
    ADD CONSTRAINT propsheets_tid_fkey FOREIGN KEY (tid) REFERENCES transactions(tid) DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 2991 (class 0 OID 0)
-- Dependencies: 6
-- Name: public; Type: ACL; Schema: -; Owner: postgresql
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgresql;
GRANT ALL ON SCHEMA public TO postgresql;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2016-09-22 11:10:26 EDT

--
-- PostgreSQL database dump complete
--

